import { copyFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

// Usage: FFMPEG_PATH=/path/to/ffmpeg node scripts/prepare-story-sequences.mjs /path/to/Projects [--sequences=6]
// Gallery stills always come from the original Images folder, never from generated animation frames.
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const sourceRoot = resolve(process.argv[2] ?? "../Projects");
const sequences = [
  { id: 3, source: resolve(sourceRoot, "Edited/3.mp4"), start: 3, duration: 8, filter: "fps=12,scale=1280:-2" },
  { id: 4, source: resolve(sourceRoot, "Edited/4.mp4"), start: 4, duration: 8, filter: "fps=12,scale=1280:-2" },
  // Remove the desktop recording chrome at the top and bottom; retain the application's interface.
  { id: 5, source: resolve(sourceRoot, "Edited/5.mp4"), start: 15, duration: 8, filter: "crop=1920:1000:0:32,fps=12,scale=1280:-2" },
  // This film has cuts at 7.50s and 13.17s; keep the entire sequence within one continuous camera move.
  { id: 6, source: resolve(sourceRoot, "Edited-2/6.mp4.mov"), start: 7.6, duration: 96 / 18, filter: "fps=18,scale=1280:-2" },
];
const selection = process.argv.slice(3).find((argument) => argument.startsWith("--sequences="));
const selectedIds = selection ? selection.slice("--sequences=".length).split(",").map(Number) : sequences.map(({ id }) => id);
if (selectedIds.some((id) => !sequences.some((sequence) => sequence.id === id))) {
  throw new Error("Sequence selection must contain only 3, 4, 5 or 6.");
}

for (const [id, count] of [[1, 6], [2, 5], [3, 5], [4, 6]]) {
  await mkdir(`public/gallery/${id}`, { recursive: true });
  for (let frame = 1; frame <= count; frame++) {
    const name = `${id}.${frame}.webp`;
    await copyFile(resolve(sourceRoot, "Images", name), `public/gallery/${id}/${name}`);
  }
}
await mkdir("public/gallery/5", { recursive: true });
for (const frame of [1, 2]) {
  await sharp(resolve(sourceRoot, `Images/5.${frame}.png`))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(`public/gallery/5/5.${frame}.webp`);
}

function convert(args) {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg exited with status ${result.status}`);
}

for (const sequence of sequences.filter(({ id }) => selectedIds.includes(id))) {
  await mkdir(`public/frames/${sequence.id}`, { recursive: true });
  convert([
    "-ss", String(sequence.start), "-i", sequence.source,
    "-t", String(sequence.duration), "-vf", sequence.filter, "-frames:v", "96",
    "-c:v", "libwebp", "-quality", "78", "-compression_level", "5", "-an",
    `public/frames/${sequence.id}/${sequence.id}.%d.webp`,
  ]);
  const frames = (await readdir(`public/frames/${sequence.id}`)).filter((name) => name.endsWith(".webp"));
  if (frames.length !== 96) throw new Error(`Expected 96 frames for sequence ${sequence.id}, found ${frames.length}`);
}

if (selectedIds.includes(6)) {
  await mkdir("public/posters", { recursive: true });
  convert([
    "-ss", "2", "-i", resolve(sourceRoot, "Edited-2/6.mp4.mov"),
    "-vf", "scale=1920:-2", "-frames:v", "1", "-c:v", "libwebp", "-quality", "86",
    "public/posters/6.webp",
  ]);
}
console.log(`Prepared sequences ${selectedIds.join(", ")} and imported original gallery stills for projects 1–5.`);
