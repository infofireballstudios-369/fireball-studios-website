import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pages = JSON.parse(readFileSync(new URL("./.generated/routes.json", import.meta.url), "utf8")) as { file: string }[];
export default defineConfig({
  base: "./",
  appType: "mpa",
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: pages.map(({ file }) => resolve(import.meta.dirname, file)),
      output: { comments: { legal: true } },
    },
  },
  server: { host: "127.0.0.1", port: 5175, strictPort: true },
});
