/** Import genuine studio media into this standalone static project. Sources are read-only. */
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: { projects: { type: "string" }, live: { type: "string" } } });
const projects = resolve(values.projects ?? join(root, "../Projects"));
const live = resolve(values.live ?? join(root, "../website-FB"));
if (root === live || root === projects) throw new Error("The destination must be separate from both source libraries.");
const publicDirectory = join(root, "public");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = { version: 1, brand: null, galleries: {}, posters: [], sequences: {}, configurator: null };
// Re-importing the base library must not discard separately prepared native-resolution provenance.
try {
  const previous = JSON.parse(await readFile(join(publicDirectory, "media-manifest.json"), "utf8"));
  if (previous.quality) manifest.quality = previous.quality;
} catch (error) { if (error.code !== "ENOENT") throw error; }

async function record(file, source, operation = "Copied without alteration") {
  const bytes = await readFile(join(publicDirectory, file));
  const entry = { path: file, source, operation, bytes: bytes.length, sha256: hash(bytes) };
  if (/\.(webp|png|jpg)$/i.test(file)) {
    const metadata = await sharp(bytes).metadata();
    Object.assign(entry, { width: metadata.width, height: metadata.height });
  }
  return entry;
}

async function copy(source, file, provenance) {
  const destination = join(publicDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return record(file, provenance);
}

manifest.brand = await copy(join(live, "public/brand/fireball-mark.webp"), "brand/fireball-mark.webp", "website-FB/public/brand/fireball-mark.webp");
for (const [id, frames] of [[1, [4, 5, 6]], [2, [4, 5]], [3, [4, 5]], [4, [5, 6]]]) {
  manifest.galleries[id] = [];
  for (const frame of frames) {
    const name = `${id}.${frame}.webp`;
    manifest.galleries[id].push(await copy(join(projects, "Images", name), `images/projects/${id}/${name}`, `Projects/Images/${name}`));
  }
}
manifest.galleries[5] = [];
for (const frame of [1, 2]) {
  const destination = `images/projects/5/5.${frame}.webp`;
  await mkdir(dirname(join(publicDirectory, destination)), { recursive: true });
  await sharp(join(projects, `Images/5.${frame}.png`)).resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 }).toFile(join(publicDirectory, destination));
  manifest.galleries[5].push(await record(destination, `Projects/Images/5.${frame}.png`, "Resized to at most 1920 pixels and encoded as WebP quality 88"));
}

for (const name of (await readdir(join(live, "public/posters"))).filter((file) => file.endsWith(".webp")).sort()) {
  manifest.posters.push(await copy(join(live, "public/posters", name), `images/posters/${name}`, `website-FB/public/posters/${name}`));
}

for (const id of [3, 4, 5, 6]) {
  const files = [];
  for (let frame = 1; frame <= 96; frame++) {
    const file = `frames/${id}/${id}.${frame}.webp`;
    files.push(await copy(join(live, "public", file), file, `website-FB/public/${file}`));
  }
  manifest.sequences[id] = { frameCount: 96, bytes: files.reduce((total, file) => total + file.bytes, 0), files };
}

const originalConfigurator = join(projects, "Edited-2/fireball-car-configurator2.html");
const preparedConfigurator = join(live, "public/experiences/car/fireball-car-configurator2.html");
let viewer = await readFile(preparedConfigurator, "utf8");
for (const marker of ["fb-vehicle-data", "fb-rim-data", "fireballIntegration", "CC BY", "Res1n", "Imagigoo"]) {
  if (!viewer.includes(marker)) throw new Error(`The prepared configurator is missing ${marker}; review its provenance before importing.`);
}
const scriptHashes = [];
for (const [, attributes, content] of viewer.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/type=["']application\/octet-stream["']/i.test(attributes)) continue;
  scriptHashes.push(`'sha256-${createHash("sha256").update(content).digest("base64")}'`);
}
const csp = [
  "default-src 'none'", "base-uri 'none'", "object-src 'none'", "form-action 'none'",
  `script-src ${scriptHashes.join(" ")} 'wasm-unsafe-eval' https://cdn.jsdelivr.net/npm/three@0.170.0/`,
  "style-src 'unsafe-inline'", "img-src data: blob:", "connect-src https://cdn.jsdelivr.net blob: data:", "worker-src blob:",
].join("; ");
// frame-ancestors cannot be delivered through a CSP meta element and is deliberately omitted.
viewer = viewer.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
  .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
  .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
const viewerPath = "experiences/car/fireball-car-configurator2.html";
await mkdir(dirname(join(publicDirectory, viewerPath)), { recursive: true });
await writeFile(join(publicDirectory, viewerPath), viewer);
manifest.configurator = {
  ...await record(viewerPath, "website-FB/public/experiences/car/fireball-car-configurator2.html", "Prepared optimised copy; added static-host CSP and noindex metadata"),
  originalSource: "Projects/Edited-2/fireball-car-configurator2.html",
  originalSha256: hash(await readFile(originalConfigurator)), preparedSha256: hash(await readFile(preparedConfigurator)),
  gzipBytes: gzipSync(viewer, { level: 6 }).length,
};

await writeFile(join(publicDirectory, "media-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ galleries: Object.values(manifest.galleries).reduce((count, files) => count + files.length, 0),
  sequences: Object.keys(manifest.sequences), frames: 384, posters: manifest.posters.length,
  viewerBytes: (await stat(join(publicDirectory, viewerPath))).size }, null, 2));
