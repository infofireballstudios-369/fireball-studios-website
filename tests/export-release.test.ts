import assert from "node:assert/strict";
import { test } from "node:test";

test("release packaging excludes local credentials, metadata and archived media", async () => {
  const { includeInRelease } = await import("../scripts/export-release.mjs");
  for (const path of [".env", ".env.local", ".env.production", ".aws/credentials", ".git/config", ".vercel/auth.json", ".netlify/state.json", "private.key", "certificate.pem", "public/videos/4.mp4", "public/previews/1.mp4", "public/motion/1/1.1.webp"]) {
    assert.equal(includeInRelease(path), false, path);
  }
});

test("release packaging retains application, active frames, genuine galleries and documentation", async () => {
  const { includeInRelease } = await import("../scripts/export-release.mjs");
  for (const path of [".env.example", "src/app/api/contact/route.ts", "public/frames/6/6.96.webp", "public/gallery/3/3.4.webp", "public/experiences/car/fireball-car-configurator2.html", "docs/PROJECT_GUIDE.md", ".github/workflows/checks.yml"]) {
    assert.equal(includeInRelease(path), true, path);
  }
});
