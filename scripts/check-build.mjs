import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parse } from "parse5";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const routes = JSON.parse(await readFile(join(root, ".generated/routes.json"), "utf8"));
const pages = new Map();
const failures = [];
let linkCount = 0, imageCount = 0, schemaCount = 0;
function nodes(node) { return [node, ...(node.childNodes || []).flatMap(nodes)]; }
function attrs(node) { return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value])); }
function text(node) { return node.nodeName === "#text" ? node.value : (node.childNodes || []).map(text).join(" "); }
const markup = new Map();
for (const { file } of routes) {
  const html = await readFile(join(dist, file), "utf8");
  const tree = parse(html); const all = nodes(tree);
  markup.set(file, html); pages.set(file, { all, ids: new Set(all.map((node) => attrs(node).id).filter(Boolean)) });
  const h1s = all.filter((node) => node.tagName === "h1");
  assert.equal(h1s.length, 1, file + ": exactly one semantic h1");
  assert.ok(all.some((node) => node.tagName === "html" && attrs(node).lang === "en-GB"), file + ": UK document language");
  for (const name of ["description", "robots"]) assert.ok(all.some((node) => node.tagName === "meta" && attrs(node).name === name && attrs(node).content), file + ": " + name);
  assert.ok(all.some((node) => node.tagName === "link" && attrs(node).rel === "canonical"), file + ": canonical");
  assert.ok(!all.some((node) => node.tagName === "iframe" || node.tagName === "video"), file + ": no initial media player");
  for (const node of all) {
    const a = attrs(node);
    if (node.tagName === "img") { imageCount++; assert.notEqual(a.alt, undefined, file + ": image has alt"); }
    if (node.tagName === "script" && a.type === "application/ld+json") { JSON.parse(text(node)); schemaCount++; }
  }
}
const syntheticOrigin = "https://static.example";
for (const [file, { all }] of pages) for (const node of all) {
  const a = attrs(node);
  for (const [attribute, target] of [["href", a.href], ["src", a.src], ["poster", a.poster]]) {
    if (!target || /^(?:https?:|mailto:|tel:|data:|blob:)/i.test(target)) continue;
    assert.ok(!target.startsWith("/"), file + ": root-dependent " + attribute + "=" + target);
    // Test the same relative link from both root hosting and a repository prefix.
    const resolved = new URL(target, syntheticOrigin + "/" + file);
    const nested = new URL(target, syntheticOrigin + "/test-repository/" + file);
    assert.equal(nested.pathname, "/test-repository" + resolved.pathname, file + ": prefix escaped by " + target);
    const pathname = decodeURIComponent(resolved.pathname).slice(1);
    let candidate = resolve(dist, pathname || ".");
    assert.ok(candidate === dist || candidate.startsWith(dist + sep), file + ": escaped dist");
    try {
      let info = await stat(candidate);
      if (info.isDirectory()) { candidate = join(candidate, "index.html"); info = await stat(candidate); }
      assert.ok(info.isFile());
      if (resolved.hash && candidate.endsWith(".html")) {
        const destination = relative(dist, candidate).split(sep).join("/");
        const targetPage = pages.get(destination);
        assert.ok(targetPage?.ids.has(decodeURIComponent(resolved.hash.slice(1))), file + ": missing anchor " + target);
      }
      if (node.tagName === "a") linkCount++;
    } catch (error) { failures.push(file + ": " + target + " — " + error.message); }
  }
}
for (const [file, html] of markup) {
  assert.doesNotMatch(html, /\/(?:api\/contact|videos\/\d\.mp4|src\/main\.ts)/, file + ": deploy-time runtime source or backend reference");
}
const home = pages.get("index.html");
assert.equal(text(home.all.find((node) => node.tagName === "h1")).replace(/\s+/g, " ").trim(), "Photorealistic 3D Visualisation That Brings Your Ideas to Life");
const chapters = home.all.filter((node) => attrs(node)["data-story-chapter"] !== undefined).map((node) => attrs(node)["data-sequence"]);
assert.deepEqual(chapters, ["3", "6", "5"]);
for (const id of [3, 4, 5, 6]) for (let frame = 1; frame <= 96; frame++) await stat(join(dist, `frames/${id}/${id}.${frame}.webp`));
const residence = pages.get("projects/interactive-residence/index.html");
const gallery = residence.all.find((node) => (attrs(node).class || "").split(" ").includes("detail-gallery"));
const galleryImages = nodes(gallery).filter((node) => node.tagName === "img").map((node) => attrs(node).src);
assert.deepEqual(galleryImages, ["../../images/projects/3/3.4.webp", "../../images/projects/3/3.5.webp"]);
assert.ok(!routes.some(({ route }) => route.startsWith("projects/") && /spaceship/.test(route)));
const contact = pages.get("contact/index.html");
assert.deepEqual(contact.all.filter((node) => ["input", "textarea"].includes(node.tagName)).map((node) => attrs(node).name), ["name", "phone", "email", "message"]);
assert.ok(markup.get("contact/index.html").includes("mailto:info@fireballstudios.co.uk"));
await stat(join(dist, ".nojekyll"));
assert.equal(failures.length, 0, failures.join("\n"));
async function totalBytes(directory) { let total = 0; for (const file of await readdir(directory, { withFileTypes: true })) { const p = join(directory, file.name); total += file.isDirectory() ? await totalBytes(p) : (await stat(p)).size; } return total; }
console.log(JSON.stringify({ htmlDocuments: pages.size, localLinkReferences: linkCount, imageElements: imageCount, jsonLdBlocks: schemaCount, homeSequences: chapters, completeFrames: 384, repositoryPrefixPaths: "passed", backendReferences: 0, initialPlayers: 0, outputBytes: await totalBytes(dist) }, null, 2));
