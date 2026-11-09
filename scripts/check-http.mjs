/** Exercise the actual static files over HTTP at root and repository-prefix URLs. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parse } from "parse5";
import { checkBuild, walk, attrs, collectReferences, cssReferences, getDocumentIds, fragmentId } from "./check-build.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const routes = JSON.parse(await readFile(join(root, ".generated/routes.json"), "utf8"));
const buildReport = await checkBuild();
const homeNodes = walk(parse(await readFile(join(dist, "index.html"), "utf8")));
const canonicalBase = new URL(attrs(homeNodes.find((node) => node.tagName === "link" && attrs(node).rel === "canonical")).href);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
let prefix = "/";
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!pathname.startsWith(prefix)) throw new Error("Missing prefix");
    let file = resolve(dist, pathname.slice(prefix.length));
    if (file !== dist && !file.startsWith(dist + sep)) throw new Error("Outside static output");
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    if (request.method === "HEAD") {
      response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
      response.end();
    } else {
      const bytes = await readFile(file);
      response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
      response.end(bytes);
    }
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : await readFile(join(dist, "404.html")));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const reports = [];
try {
  for (prefix of ["/", "/test-repository/"]) {
    const links = new Set(), assets = new Set(), documents = new Map(), checked = new Set();
    let fragments = 0, srcsetCandidates = 0, cssAssets = 0;
    const localTarget = (value, source) => {
      const target = new URL(value, source);
      assert.ok(["http:", "https:", "mailto:", "tel:", "data:", "blob:"].includes(target.protocol), source + ": unsupported URL " + value);
      if (target.origin === canonicalBase.origin) {
        assert.ok(target.pathname.startsWith(canonicalBase.pathname), source + ": canonical URL escaped project prefix");
        const mapped = new URL(prefix + target.pathname.slice(canonicalBase.pathname.length), origin);
        mapped.search = target.search; mapped.hash = target.hash;
        return mapped;
      }
      if (target.origin !== origin) return;
      assert.ok(target.pathname.startsWith(prefix), source + ": escaped hosting prefix via " + value);
      return target;
    };
    const fetchLocal = async (url, method = "GET") => {
      assert.equal(new URL(url).origin, origin, "Checks must not request third-party services");
      const response = await fetch(url, { method, redirect: "error", signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200, method + " " + url);
      return response;
    };
    const documentAt = async (url) => {
      const target = new URL(url); target.hash = "";
      if (!documents.has(target.href)) documents.set(target.href, fetchLocal(target).then(async (response) => {
        assert.match(response.headers.get("content-type") || "", /(?:text\/html|image\/svg\+xml)/i, target.href + ": HTML/SVG fragment destination");
        const all = walk(parse(await response.text()));
        return { all, ids: getDocumentIds(all, target.href) };
      }));
      return documents.get(target.href);
    };
    const validate = async (reference, sourceUrl) => {
      const target = localTarget(reference.target, sourceUrl);
      if (!target) return;
      const hash = target.hash;
      target.hash = "";
      if (reference.node.tagName === "a" || reference.attribute === "refresh") links.add(target.href);
      else assets.add(target.href);
      if (!checked.has(target.href)) {
        const response = await fetchLocal(target, "HEAD");
        const extension = extname(target.pathname);
        if (types[extension]) assert.equal(response.headers.get("content-type"), types[extension], target.href + ": correct content type");
        checked.add(target.href);
      }
      if (hash) {
        const type = extname(target.pathname);
        if (!type || [".html", ".svg"].includes(type)) {
          const id = fragmentId(hash);
          if (id) {
            const destination = await documentAt(target);
            assert.ok(destination.ids.has(id), sourceUrl + ": missing cross-page anchor " + reference.target);
            fragments++;
          }
        }
      }
      if (target.pathname.endsWith(".css") && !documents.has(target.href)) {
        const response = await fetchLocal(target);
        const css = await response.text();
        documents.set(target.href, Promise.resolve({ css }));
        for (const value of cssReferences(css)) {
          const asset = localTarget(value, target.href);
          if (!asset) continue;
          asset.hash = "";
          const response = await fetchLocal(asset, "HEAD");
          assert.ok(!response.headers.get("content-type")?.includes("text/html"), asset.href + ": stylesheet asset must not be an HTML fallback");
          cssAssets++;
        }
      }
    };
    for (const { file } of routes) {
      const url = new URL(prefix + file, origin);
      const { all } = await documentAt(url);
      assert.ok(!all.some((node) => node.tagName === "iframe" || node.tagName === "video"), url.href + ": media remains deferred");
      for (const node of all) if (attrs(node).srcset) srcsetCandidates += collectReferences([node]).filter((reference) => reference.attribute === "srcset").length;
      for (const reference of collectReferences(all)) await validate(reference, url.href);
    }
    // Linked pretty URLs must return HTML as well as the generated index.html files.
    for (const value of links) {
      const url = new URL(value);
      if (!extname(url.pathname) || url.pathname.endsWith(".html")) await documentAt(url);
    }
    for (const filename of ["sitemap.xml", "robots.txt", ".nojekyll"]) await fetchLocal(origin + prefix + filename, "HEAD");
    const missing = await fetch(origin + prefix + "not-a-route/deep/", { signal: AbortSignal.timeout(10000) });
    assert.equal(missing.status, 404);
    const missingAll = walk(parse(await missing.text()));
    assert.match(missingAll.map((node) => node.nodeName === "#text" ? node.value : "").join(" "), /Out of the frame/);
    assert.ok(missingAll.some((node) => node.tagName === "meta" && attrs(node).name === "robots" && /\bnoindex\b/.test(attrs(node).content)));
    reports.push({ prefix, documents: routes.length, pageLinkTargets: links.size, assets: assets.size, verifiedFragments: fragments, srcsetCandidates, stylesheetAssets: cssAssets, missingPage: "404", initialPlayers: 0 });
  }
  console.log(JSON.stringify({ buildAudit: buildReport, staticHttp: reports }, null, 2));
} finally { await new Promise((resolve) => server.close(resolve)); }
