/** Test-only static hosting at both a domain root and a repository prefix. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parse } from "parse5";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const routes = JSON.parse(await readFile(join(root, ".generated/routes.json"), "utf8"));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
let prefix = "/";
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!pathname.startsWith(prefix)) throw new Error("Missing prefix");
    let file = resolve(dist, pathname.slice(prefix.length));
    if (file !== dist && !file.startsWith(dist + sep)) throw new Error("Outside static output");
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const bytes = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(join(dist, "404.html")));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const reports = [];
try {
  for (prefix of ["/", "/test-repository/"]) {
    const links = new Set(), assets = new Set();
    for (const { file } of routes) {
      const url = new URL(prefix + file, origin);
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200, url.href);
      const all = walk(parse(await response.text()));
      assert.ok(!all.some((node) => node.tagName === "iframe" || node.tagName === "video"));
      for (const node of all) {
        const a = attrs(node);
        for (const target of [a.href, a.src]) {
          if (!target || /^(https?:|mailto:|tel:|data:|blob:)/i.test(target)) continue;
          const destination = new URL(target, url);
          destination.hash = "";
          assert.ok(destination.pathname.startsWith(prefix), url.href + ": escaped prefix");
          if (node.tagName === "a") links.add(destination.href); else assets.add(destination.href);
        }
      }
    }
    for (const url of links) {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200, url); await response.arrayBuffer();
    }
    for (const url of assets) {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200, url);
      if (new URL(url).pathname.endsWith(".css")) {
        const css = await (await fetch(url)).text();
        for (const match of css.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
          if (match[1].startsWith("data:")) continue;
          const font = new URL(match[1], url);
          assert.ok(font.pathname.startsWith(prefix));
          const fontResponse = await fetch(font, { method: "HEAD" });
          assert.equal(fontResponse.status, 200, font.href);
        }
      }
    }
    const missing = await fetch(origin + prefix + "not-a-route/deep/", { signal: AbortSignal.timeout(10000) });
    assert.equal(missing.status, 404); assert.match(await missing.text(), /Out of the frame/);
    reports.push({ prefix, documents: routes.length, pageLinkTargets: links.size, assets: assets.size, missingPage: "404", initialPlayers: 0 });
  }
  console.log(JSON.stringify({ staticHttp: reports }, null, 2));
} finally { await new Promise((resolve) => server.close(resolve)); }
