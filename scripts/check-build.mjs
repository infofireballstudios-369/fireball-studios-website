import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parse } from "parse5";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
export const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
export const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
export const text = (node) => node?.nodeName === "#text" ? node.value : (node?.childNodes || []).map(text).join(" ");
export const normalText = (node) => text(node).replace(/\s+/g, " ").trim();

/** Follow the srcset URL/descriptor boundaries, including commas within data URLs. */
export function srcsetUrls(value) {
  const urls = [];
  let index = 0;
  while (index < value.length) {
    while (/[\t\n\f\r ,]/.test(value[index] ?? "") && index < value.length) index++;
    const start = index;
    while (index < value.length && !/[\t\n\f\r ]/.test(value[index])) index++;
    let url = value.slice(start, index);
    if (!url) break;
    if (url.endsWith(",")) { urls.push(url.replace(/,+$/, "")); continue; }
    let descriptor = "", parentheses = 0;
    while (index < value.length) {
      const character = value[index++];
      if (character === "(" ) parentheses++;
      if (character === ")") parentheses--;
      if (character === "," && parentheses === 0) break;
      descriptor += character;
    }
    descriptor = descriptor.trim();
    assert.ok(!descriptor || /^\d+w$/.test(descriptor) || /^(?:\d+(?:\.\d+)?|\.\d+)x$/.test(descriptor), "Invalid srcset descriptor: " + descriptor);
    assert.ok(!descriptor || Number.parseFloat(descriptor) > 0, "srcset descriptors must be positive");
    urls.push(url);
  }
  return urls;
}

export function collectReferences(all) {
  const references = [];
  for (const node of all) {
    const a = attrs(node);
    for (const name of ["href", "src", "poster", "action"]) if (a[name]) references.push({ node, attribute: name, target: a[name] });
    for (const name of ["srcset", "imagesrcset"]) if (a[name]) for (const target of srcsetUrls(a[name])) references.push({ node, attribute: name, target });
    if (node.tagName === "meta" && ["og:image", "twitter:image"].includes(a.property || a.name)) references.push({ node, attribute: "content", target: a.content });
    if (node.tagName === "meta" && (a["http-equiv"] || "").toLowerCase() === "refresh") {
      const match = /^\s*\d+(?:\.\d+)?\s*;\s*url\s*=\s*(.*?)\s*$/i.exec(a.content || "");
      assert.ok(match, "Invalid refresh target");
      references.push({ node, attribute: "refresh", target: match[1].replace(/^(['"])(.*)\1$/, "$2") });
    }
  }
  return references;
}

export function cssReferences(css) {
  return [...css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)'";]+))\s*\)/g)].map((match) => match[1] || match[2] || match[3]);
}

export function getDocumentIds(all, label) {
  const ids = new Set(), elementIds = new Set();
  for (const node of all) {
    const a = attrs(node);
    if (a.id) { assert.ok(!elementIds.has(a.id), label + ": duplicate id " + a.id); elementIds.add(a.id); ids.add(a.id); }
    if (node.tagName === "a" && a.name) ids.add(a.name);
  }
  return ids;
}

export function fragmentId(hash) {
  // Text-fragment directives do not require a matching element ID.
  return decodeURIComponent(hash.slice(1).split(":~:")[0]);
}

/** Map declared canonical-host URLs into the same portable local site. */
export function localUrl(target, sourceUrl, siteUrl) {
  const url = new URL(target, sourceUrl);
  assert.ok(["http:", "https:", "mailto:", "tel:", "data:", "blob:"].includes(url.protocol), "Unsupported URL protocol: " + target);
  if (!["http:", "https:"].includes(url.protocol)) return;
  const host = new URL(sourceUrl), configured = new URL(siteUrl);
  if (url.origin === host.origin) return url;
  if (url.origin !== configured.origin) return;
  assert.ok(url.pathname.startsWith(configured.pathname), "Canonical-host URL escaped the project prefix: " + target);
  const mapped = new URL(url.pathname.slice(configured.pathname.length), host.origin + "/");
  mapped.search = url.search; mapped.hash = url.hash;
  return mapped;
}

async function totalBytes(directory) {
  let total = 0;
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    total += file.isDirectory() ? await totalBytes(path) : (await stat(path)).size;
  }
  return total;
}

export async function checkBuild() {
  const routes = JSON.parse(await readFile(join(root, ".generated/routes.json"), "utf8"));
  const pages = new Map(), markup = new Map(), failures = [];
  let linkCount = 0, imageCount = 0, schemaCount = 0, fragmentCount = 0, srcsetCount = 0, assetCount = 0;
  const requireOne = (all, tag, predicate, label) => {
    const found = all.filter((node) => node.tagName === tag && predicate(attrs(node)));
    assert.equal(found.length, 1, label);
    return found[0];
  };
  for (const route of routes) {
    const { file } = route;
    const html = await readFile(join(dist, file), "utf8");
    const all = walk(parse(html));
    markup.set(file, html);
    pages.set(file, { all, ids: getDocumentIds(all, file), route });
  }
  const home = pages.get("index.html");
  assert.ok(home, "Missing homepage");
  const siteUrl = attrs(requireOne(home.all, "link", (a) => (a.rel || "").split(/\s+/).includes("canonical"), "Homepage canonical")).href;
  const base = new URL(siteUrl);
  assert.ok(base.pathname.endsWith("/") && !base.search && !base.hash, "Homepage canonical must be a clean directory URL");
  assert.ok(base.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Public canonical URL must use HTTPS");
  const syntheticOrigin = "https://static.example";
  const cachedFiles = new Map();
  const readTarget = async (candidate) => {
    if (!cachedFiles.has(candidate)) cachedFiles.set(candidate, readFile(candidate, "utf8").then((value) => {
      const all = walk(parse(value));
      return { all, ids: getDocumentIds(all, relative(dist, candidate)) };
    }));
    return cachedFiles.get(candidate);
  };
  const verifyReference = async (target, file, label, checkFragment = true) => {
    if (!target) throw new Error(label + ": empty URL");
    const sourceUrl = syntheticOrigin + "/" + file;
    const resolved = localUrl(target, sourceUrl, siteUrl);
    if (!resolved) return;
    // Absolute canonical metadata is intentional; all relative URLs must also work below a repository path.
    if (!/^[a-z][a-z\d+.-]*:/i.test(target)) {
      assert.ok(!target.startsWith("/"), label + ": root-dependent URL " + target);
      const nested = new URL(target, syntheticOrigin + "/test-repository/" + file);
      assert.equal(nested.pathname, "/test-repository" + resolved.pathname, label + ": prefix escaped by " + target);
    }
    const pathname = decodeURIComponent(resolved.pathname).slice(1);
    assert.ok(!pathname.includes("\0"), label + ": invalid path");
    let candidate = resolve(dist, pathname || ".");
    assert.ok(candidate === dist || candidate.startsWith(dist + sep), label + ": escaped dist");
    let info = await stat(candidate);
    if (info.isDirectory()) { candidate = join(candidate, "index.html"); info = await stat(candidate); }
    assert.ok(info.isFile(), label + ": expected a file");
    assetCount++;
    if (checkFragment && resolved.hash && /\.(?:html|svg)$/.test(candidate)) {
      const id = fragmentId(resolved.hash);
      if (id) {
        const destination = relative(dist, candidate).split(sep).join("/");
        const targetPage = pages.get(destination) || await readTarget(candidate);
        assert.ok(targetPage.ids.has(id), label + ": missing destination anchor " + target);
        fragmentCount++;
      }
    }
    return true;
  };
  const indexableCanonicals = [], allCanonicals = [];
  for (const [file, { all, route }] of pages) {
    const title = normalText(requireOne(all, "title", () => true, file + ": one title"));
    assert.ok(title.length > 12 && title.length < 120, file + ": descriptive title");
    assert.equal(title, route.title, file + ": effective SEO title matches manifest");
    assert.ok(normalText(requireOne(all, "h1", () => true, file + ": one semantic h1")), file + ": nonempty h1");
    requireOne(all, "html", (a) => a.lang === "en-GB", file + ": UK document language");
    requireOne(all, "meta", (a) => a.name === "viewport" && Boolean(a.content), file + ": viewport");
    const meta = (name) => attrs(requireOne(all, "meta", (a) => (a.name || a.property) === name, file + ": one " + name)).content;
    const description = meta("description"), robots = meta("robots");
    assert.ok(description?.length > 25 && description.length < 320, file + ": descriptive summary");
    assert.equal(description, route.description, file + ": effective SEO summary matches manifest");
    const canonical = attrs(requireOne(all, "link", (a) => (a.rel || "").split(/\s+/).includes("canonical"), file + ": one canonical")).href;
    const canonicalUrl = new URL(canonical);
    assert.equal(canonicalUrl.origin, base.origin, file + ": canonical origin");
    assert.ok(canonicalUrl.pathname.startsWith(base.pathname) && !canonicalUrl.search && !canonicalUrl.hash, file + ": canonical preserves the project prefix");
    assert.equal(canonical, route.canonical, file + ": route manifest canonical matches output");
    const refresh = collectReferences(all).find((reference) => reference.attribute === "refresh");
    const expectedCanonical = refresh ? new URL(refresh.target, new URL(route.route, siteUrl)) : new URL(route.file === "404.html" ? route.file : route.route, siteUrl);
    expectedCanonical.hash = "";
    assert.equal(canonical, expectedCanonical.href, file + ": canonical target");
    assert.equal(meta("og:title"), title, file + ": Open Graph title");
    assert.equal(meta("twitter:title"), title, file + ": Twitter title");
    assert.equal(meta("og:description"), description, file + ": Open Graph summary");
    assert.equal(meta("twitter:description"), description, file + ": Twitter summary");
    assert.equal(meta("og:url"), canonical, file + ": Open Graph canonical");
    assert.equal(meta("og:locale"), "en_GB", file + ": Open Graph locale");
    assert.equal(meta("og:type"), route.route.startsWith("blog/") && route.route !== "blog/" && !refresh ? "article" : "website", file + ": appropriate social content type");
    assert.equal(meta("twitter:card"), "summary_large_image", file + ": social image card");
    assert.equal(meta("og:image"), meta("twitter:image"), file + ": consistent social image");
    assert.ok(/^https?:\/\//.test(meta("og:image")), file + ": absolute social image");
    if (!route.indexable || refresh) assert.match(robots, /(?:^|[\s,])noindex(?:$|[\s,])/i, file + ": fallback and redirect stay noindex");
    if (route.indexable && !/\bnoindex\b/i.test(robots)) indexableCanonicals.push(canonical);
    if (route.indexable) allCanonicals.push(canonical);
    assert.ok(!all.some((node) => node.tagName === "iframe" || node.tagName === "video"), file + ": no initial media player");
    for (const node of all) {
      const a = attrs(node);
      if (node.tagName === "img") { imageCount++; assert.notEqual(a.alt, undefined, file + ": image has alt"); }
      if (a.srcset) srcsetCount += srcsetUrls(a.srcset).length;
      if (node.tagName === "script" && a.type === "application/ld+json") {
        const schemas = JSON.parse(text(node)); schemaCount++;
        const inspect = async (value, key = "") => {
          if (Array.isArray(value)) { for (const entry of value) await inspect(entry, key); return; }
          if (value && typeof value === "object") { for (const [name, entry] of Object.entries(value)) await inspect(entry, name); return; }
          if (typeof value === "string" && ["url", "image", "logo", "thumbnailUrl", "item", "@id"].includes(key) && /^https?:\/\//.test(value)) {
            // JSON-LD identifiers such as #organisation describe entities, not DOM IDs.
            await verifyReference(value, file, file + ": schema " + key, key !== "@id");
          }
        };
        await inspect(schemas);
      }
    }
    for (const reference of collectReferences(all)) {
      try {
        const local = await verifyReference(reference.target, file, `${file}: ${reference.attribute}=${reference.target}`);
        if (local && reference.node.tagName === "a") linkCount++;
      } catch (error) { failures.push(error.message); }
    }
  }
  assert.equal(new Set(allCanonicals).size, allCanonicals.length, "Primary page canonicals must be unique");
  const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
  const sitemapUrls = walk(parse(sitemap)).filter((node) => node.tagName === "loc").map(normalText);
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "Sitemap must not contain duplicate URLs");
  assert.deepEqual([...sitemapUrls].sort(), [...indexableCanonicals].sort(), "Sitemap must contain exactly the indexable canonicals");
  const robots = await readFile(join(dist, "robots.txt"), "utf8");
  const sitemapDirectives = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map((match) => match[1]);
  assert.deepEqual(sitemapDirectives, indexableCanonicals.length ? [new URL("sitemap.xml", siteUrl).href] : [], "Robots sitemap declaration follows indexing mode");
  for (const file of await readdir(join(dist, "assets"))) if (file.endsWith(".css")) {
    const path = "assets/" + file;
    for (const target of cssReferences(await readFile(join(dist, path), "utf8"))) {
      try { await verifyReference(target, path, path + ": url(" + target + ")"); }
      catch (error) { failures.push(error.message); }
    }
  }
  for (const [file, html] of markup) assert.doesNotMatch(html, /\/(?:api\/contact|videos\/\d\.mp4|src\/main\.ts)/, file + ": runtime source or obsolete backend reference");
  assert.equal(normalText(home.all.find((node) => node.tagName === "h1")), "Photorealistic 3D Visualisation That Brings Your Ideas to Life");
  const chapters = home.all.filter((node) => attrs(node)["data-story-chapter"] !== undefined).map((node) => attrs(node)["data-sequence"]);
  assert.deepEqual(chapters, ["3", "6", "5"]);
  for (const id of [3, 4, 5, 6]) for (let frame = 1; frame <= 96; frame++) await stat(join(dist, `frames/${id}/${id}.${frame}.webp`));
  const residence = pages.get("projects/interactive-residence/index.html");
  const gallery = residence.all.find((node) => (attrs(node).class || "").split(" ").includes("detail-gallery"));
  const galleryImages = walk(gallery).filter((node) => node.tagName === "img").map((node) => attrs(node).src);
  assert.deepEqual(galleryImages, ["../../images/projects/3/3.4.webp", "../../images/projects/3/3.5.webp"]);
  assert.ok(!routes.some(({ route }) => route.startsWith("projects/") && /spaceship/.test(route)));
  const contact = pages.get("contact/index.html");
  const fields = contact.all.filter((node) => ["input", "textarea", "select"].includes(node.tagName) && attrs(node).type !== "hidden" && attrs(node).name !== "website").map((node) => attrs(node).name);
  assert.deepEqual(fields, ["name", "phone", "email", "message"]);
  assert.ok(markup.get("contact/index.html").includes("mailto:info@fireballstudios.co.uk"));
  await stat(join(dist, ".nojekyll"));
  assert.equal(failures.length, 0, failures.join("\n"));
  return { htmlDocuments: pages.size, indexableCanonicals: indexableCanonicals.length, localLinkReferences: linkCount, localAssetReferences: assetCount, verifiedFragments: fragmentCount, srcsetCandidates: srcsetCount, imageElements: imageCount, jsonLdBlocks: schemaCount, homeSequences: chapters, completeFrames: 384, repositoryPrefixPaths: "passed", backendReferences: 0, initialPlayers: 0, outputBytes: await totalBytes(dist) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await checkBuild(), null, 2));
