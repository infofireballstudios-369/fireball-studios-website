import { cp, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function includeInRelease(path) {
  const parts = path.split("/");
  if (parts.some((part) => [".git", ".aws", ".codex", ".agents", "node_modules", ".next", ".vercel", ".netlify"].includes(part))) return false;
  if (parts.some((part) => part.startsWith(".env") && part !== ".env.example")) return false;
  if (/\.(?:pem|key|p12|pfx|tsbuildinfo)$/i.test(path)) return false;
  return !["public/videos/", "public/previews/", "public/motion/"].some((prefix) => path.startsWith(prefix)) && path !== "next-env.d.ts";
}

export async function exportRelease(destination) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const target = resolve(destination);
  const source = resolve(root);
  if (target === source || target.startsWith(source + sep) || source.startsWith(target + sep)) throw new Error("Choose a separate empty directory outside the project.");
  await mkdir(target, { recursive: true });
  if ((await readdir(target)).length) throw new Error("The release destination must be empty; existing files are never overwritten.");
  const paths = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: source, encoding: "utf8" }).split("\0").filter(Boolean))].sort();
  const files = [];
  for (const path of paths.filter(includeInRelease)) {
    const input = resolve(source, path);
    if (!input.startsWith(source + sep)) throw new Error("A source path escaped the project.");
    let stat;
    try { stat = await lstat(input); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Release sources must be regular files: " + path);
    if (stat.size > 90 * 1024 * 1024) throw new Error("A file exceeds the safe GitHub release budget: " + path);
    const output = resolve(target, path);
    await mkdir(dirname(output), { recursive: true });
    await cp(input, output);
    files.push({ path, bytes: stat.size, sha256: createHash("sha256").update(await readFile(output)).digest("hex") });
  }
  const manifest = {
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim(),
    sourceBranch: execFileSync("git", ["branch", "--show-current"], { cwd: source, encoding: "utf8" }).trim(),
    files,
    excluded: ["Git history and local credentials", "Archived local videos, previews and unused motion sequences"],
  };
  await writeFile(resolve(target, "RELEASE_MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { destination: target, files: files.length, bytes: files.reduce((total, file) => total + file.bytes, 0), sourceCommit: manifest.sourceCommit };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node scripts/export-release.mjs /absolute/path/to/an/empty/directory");
  console.log(JSON.stringify(await exportRelease(process.argv[2]), null, 2));
}
