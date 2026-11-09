import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const project = resolve(import.meta.dirname, "..");

export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  appType: "mpa",
  publicDir: false,
  plugins: [{
    name: "capture-static-metadata",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: readFileSync(resolve(import.meta.dirname, "_headers")) });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: "User-agent: *\nAllow: /\n" });
      for (const name of ["space-grotesk", "plus-jakarta-sans"]) {
        this.emitFile({ type: "asset", fileName: `licenses/${name}.txt`, source: readFileSync(resolve(project, `public/licenses/${name}.txt`)) });
      }
    },
  }],
  build: {
    target: "es2022",
    outDir: resolve(project, "capture-dist"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rolldownOptions: { input: { form: resolve(import.meta.dirname, "index.html"), thanks: resolve(import.meta.dirname, "thanks/index.html") } },
  },
});
