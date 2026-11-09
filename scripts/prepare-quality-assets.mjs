/** Optional native-source extraction. Builds and tests use the shipped files, not these external libraries. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: { projects: { type: "string" }, live: { type: "string" }, ffmpeg: { type: "string" } } });
const projects = resolve(values.projects ?? join(root, "../Projects"));
const live = resolve(values.live ?? join(root, "../website-FB"));
if (root === live || root === projects) throw new Error("The destination must be separate from the source libraries.");
const ffmpeg = values.ffmpeg ?? process.env.FFMPEG_PATH ?? "ffmpeg";
const publicDirectory = join(root, "public");
const manifestPath = join(publicDirectory, "media-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sequences = [
  { id: 3, file: join(live, "public/videos/3.mp4"), source: "website-FB/public/videos/3.mp4", start: 3, duration: 8, fps: 12, crop: "", nativeWidth: 3840, nativeHeight: 2160, posterAt: 3, widths: [1920, 2560, 3840] },
  { id: 6, file: join(projects, "Edited-2/6.mp4.mov"), source: "Projects/Edited-2/6.mp4.mov", start: 7.6, duration: 96 / 18, fps: 18, crop: "", nativeWidth: 3840, nativeHeight: 2160, posterAt: 2, widths: [1920, 2560, 3840] },
  // Crop only desktop recording chrome; retain the genuine application interface and geometry.
  { id: 5, file: join(live, "public/videos/5.mp4"), source: "website-FB/public/videos/5.mp4", start: 15, duration: 8, fps: 12, crop: "crop=1920:1000:0:32,", nativeWidth: 1920, nativeHeight: 1080, posterAt: 15, widths: [1920] },
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const quality = { webpQuality: 88, frameCount: 96, sequences: {}, posters: {} };

function convert(args) {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg exited with ${result.status}`);
}
async function record(path) {
  const bytes = await readFile(join(publicDirectory, path));
  const { width, height } = await sharp(bytes).metadata();
  return { path, bytes: bytes.length, width, height, sha256: hash(bytes) };
}

for (const sequence of sequences) {
  const sourceSha256 = hash(await readFile(sequence.file));
  const entry = { source: sequence.source, sourceSha256, nativeWidth: sequence.nativeWidth, nativeHeight: sequence.nativeHeight,
    startSeconds: sequence.start, durationSeconds: sequence.duration, framesPerSecond: sequence.fps,
    crop: sequence.crop.replace(/,$/, "") || null, frameCount: 96, variants: {} };
  for (const width of sequence.widths) {
    const directory = `frames/quality/${sequence.id}/${width}`;
    await mkdir(join(publicDirectory, directory), { recursive: true });
    convert(["-ss", String(sequence.start), "-i", sequence.file, "-t", String(sequence.duration),
      "-vf", `${sequence.crop}fps=${sequence.fps},scale=${width}:-2`, "-frames:v", "96", "-c:v", "libwebp", "-quality", "88", "-compression_level", "5", "-an",
      join(publicDirectory, directory, `${sequence.id}.%d.webp`)]);
    const files = [];
    for (let frame = 1; frame <= 96; frame++) files.push(await record(`${directory}/${sequence.id}.${frame}.webp`));
    entry.variants[width] = { width, height: files[0].height, bytes: files.reduce((total, file) => total + file.bytes, 0), files };
    console.log(`Sequence ${sequence.id}, ${width}px: ${entry.variants[width].bytes} bytes / 96 frames`);
  }
  quality.sequences[sequence.id] = entry;
  const posters = [];
  await mkdir(join(publicDirectory, `images/posters/quality/${sequence.id}`), { recursive: true });
  const posterSource = sequence.id === 3 ? "Projects/Images/3.5.webp" : sequence.id === 5 ? "Projects/Images/5.2.png" : sequence.source;
  const originalStill = sequence.id === 3 ? join(projects, "Images/3.5.webp") : sequence.id === 5 ? join(projects, "Images/5.2.png") : null;
  const posterWidths = sequence.id === 6 ? [1280, 1920, 2560, 3840] : [1280, 1920];
  for (const width of posterWidths) {
    const path = `images/posters/quality/${sequence.id}/${sequence.id}-${width}.webp`;
    if (originalStill) {
      if (sequence.id === 3 && width === 1920) await writeFile(join(publicDirectory, path), await readFile(originalStill));
      else await sharp(originalStill).resize({ width, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(join(publicDirectory, path));
    } else convert(["-ss", String(sequence.posterAt), "-i", sequence.file, "-vf", `${sequence.crop}scale=${width}:-2`, "-frames:v", "1",
        "-c:v", "libwebp", "-quality", "88", "-compression_level", "5", "-an", join(publicDirectory, path)]);
    posters.push(await record(path));
  }
  quality.posters[sequence.id] = { source: posterSource, sourceSha256: originalStill ? hash(await readFile(originalStill)) : sourceSha256,
    atSeconds: originalStill ? null : sequence.posterAt, operation: originalStill ? "Genuine clean still, without enlargement; native WebP copied exactly" : "Extracted from original video without enlargement", files: posters };
}
manifest.quality = quality;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("Native-source quality variants prepared; original 384 animation frames and gallery stills are unchanged.");
