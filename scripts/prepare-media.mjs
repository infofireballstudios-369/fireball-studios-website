import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

// Usage: FFMPEG_PATH=/path/to/ffmpeg node scripts/prepare-media.mjs /path/to/Projects
// Derived assets are regenerated; source videos and the original stills are preserved.
const sourceRoot = resolve(process.argv[2] ?? "../Projects");
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";

function convert(args) {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg exited with status ${result.status}`);
}

for (const directory of ["public/motion/1", "public/motion/2", "public/posters", "public/previews"]) {
  await mkdir(directory, { recursive: true });
}

for (const [id, count] of [[1, 75], [2, 120]]) {
  convert([
    "-i", resolve(sourceRoot, `${id}.mp4`),
    "-vf", "scale=1440:-2", "-frames:v", String(count),
    "-c:v", "libwebp", "-quality", "75", "-compression_level", "5", "-an",
    `public/motion/${id}/${id}.%d.webp`,
  ]);
}

const posters = [
  ["public/motion/1/1.1.webp", "1"],
  ["public/motion/2/2.1.webp", "2"],
  [resolve(sourceRoot, "Images/3.5.webp"), "3"],
  [resolve(sourceRoot, "Images/4.6.webp"), "4"],
  [resolve(sourceRoot, "Images/5.2.png"), "5"],
  [resolve(sourceRoot, "Images/5.1.png"), "product-detail"],
];
for (const [source, name] of posters) {
  await sharp(source).resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 84 }).toFile(`public/posters/${name}.webp`);
}

convert([
  "-ss", "2", "-i", resolve(sourceRoot, "Edited/Project-3.mp4"),
  "-vf", "scale=1440:-2", "-frames:v", "1", "-c:v", "libwebp", "-quality", "84",
  "public/posters/hangar.webp",
]);
await sharp("public/motion/1/1.1.webp").resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 88 }).toFile("public/og-image.jpg");

const previews = [
  [resolve(sourceRoot, "1.mp4"), "1"],
  [resolve(sourceRoot, "2.mp4"), "2"],
  [resolve(sourceRoot, "Edited/3.mp4"), "3"],
  [resolve(sourceRoot, "Edited/4.mp4"), "4"],
  [resolve(sourceRoot, "Edited/5.mp4"), "5"],
  [resolve(sourceRoot, "Edited/Project-3.mp4"), "hangar"],
];
for (const [source, name] of previews) {
  convert([
    "-i", source, "-vf", "scale=1280:-2,fps=24",
    "-c:v", "libx264", "-preset", "fast", "-crf", "25", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", `public/previews/${name}.mp4`,
  ]);
}
console.log("Prepared scroll sequences, posters, social image and browser video previews.");
