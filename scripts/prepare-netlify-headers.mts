import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getNetlifyHeaders } from "../src/lib/securityHeaders";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const selectors = ["/_next/*"];
async function addExactFiles(directory: string, prefix: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) await addExactFiles(join(directory, entry.name), prefix + entry.name + "/");
    else if (entry.isFile()) selectors.push(prefix + entry.name);
  }
}
for (const entry of await readdir(publicDirectory, { withFileTypes: true })) {
  if (["_headers", "_redirects"].includes(entry.name) || entry.name.startsWith(".")) continue;
  // Experience documents can have different policies; avoid an overlapping wildcard.
  if (entry.isDirectory() && entry.name === "experiences") await addExactFiles(join(publicDirectory, entry.name), "/experiences/");
  else if (entry.isDirectory()) selectors.push("/" + entry.name + "/*");
  else if (entry.isFile()) selectors.push("/" + entry.name);
}
await writeFile(join(publicDirectory, "_headers"), getNetlifyHeaders({ ...process.env, NODE_ENV: "production" }, selectors));
console.log("Prepared shared security headers for Netlify static delivery.");
