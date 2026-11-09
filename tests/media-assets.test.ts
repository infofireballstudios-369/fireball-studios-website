import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
import { parseHTML } from "linkedom";
import { assetUrl, getFramePath, getFramePaths, getVimeoVideo, homeSequenceIds, sequenceConfigs } from "../src/data/assetManifest";

const root = process.cwd();
const digest = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

test("media URLs support domain roots, project subpaths and nested static pages", () => {
  assert.deepEqual(homeSequenceIds, [3, 6, 5]);
  assert.equal(getFramePath(3, 1), "frames/3/3.1.webp");
  assert.equal(getFramePath(6, 96), "frames/6/6.96.webp");
  assert.equal(assetUrl(getFramePath(5, 40), "../../"), "../../frames/5/5.40.webp");
  assert.equal(assetUrl("brand/fireball-mark.webp", "/fireball/"), "/fireball/brand/fireball-mark.webp");
  assert.equal(getFramePaths(3, "../").length, 96);
  assert.equal(getVimeoVideo(6).watchUrl, "https://vimeo.com/1243948923");
  assert.throws(() => getFramePath(3, 97), RangeError);
  assert.throws(() => getFramePath(1, 1), RangeError);
  assert.throws(() => getVimeoVideo(7), RangeError);
});

test("all 384 source frames are present, decodable and match the recorded provenance", async () => {
  const manifest = JSON.parse(await readFile(join(root, "public/media-manifest.json"), "utf8"));
  for (const id of [3, 4, 5, 6] as const) {
    const directory = join(root, "public/frames", String(id));
    const files = (await readdir(directory)).filter((name) => name.endsWith(".webp"));
    assert.equal(files.length, sequenceConfigs[id].frameCount);
    for (let frame = 1; frame <= 96; frame++) {
      const path = getFramePath(id, frame);
      const bytes = await readFile(join(root, "public", path));
      const provenance = manifest.sequences[id].files[frame - 1];
      assert.equal(provenance.path, path);
      assert.equal(provenance.sha256, digest(bytes));
      await sharp(bytes).resize(1, 1).raw().toBuffer();
    }
  }
});

test("project galleries contain only the genuine selected stills, including the two product PNG derivatives", async () => {
  const expected: Record<string, string[]> = {
    1: ["1.4.webp", "1.5.webp", "1.6.webp"], 2: ["2.4.webp", "2.5.webp"],
    3: ["3.4.webp", "3.5.webp"], 4: ["4.5.webp", "4.6.webp"], 5: ["5.1.webp", "5.2.webp"],
  };
  for (const [id, names] of Object.entries(expected)) {
    assert.deepEqual((await readdir(join(root, "public/images/projects", id))).sort(), names);
  }
  const manifest = JSON.parse(await readFile(join(root, "public/media-manifest.json"), "utf8"));
  assert.equal(manifest.galleries[5][0].source, "Projects/Images/5.1.png");
  assert.equal(manifest.galleries[5][1].source, "Projects/Images/5.2.png");
  assert.equal(digest(await readFile(join(root, "public/brand/fireball-mark.webp"))), manifest.brand.sha256);
});

test("the standalone configurator retains attribution and an executable-script CSP without unsupported directives", async () => {
  const html = await readFile(join(root, "public/experiences/car/fireball-car-configurator2.html"), "utf8");
  const { document } = parseHTML(html);
  assert.match(document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "", /noindex/);
  const policy = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content") ?? "";
  assert.match(policy, /wasm-unsafe-eval/);
  assert.doesNotMatch(policy, /frame-ancestors/);
  assert.ok(!policy.includes("'unsafe-eval'"));
  for (const script of document.querySelectorAll("script")) {
    if (script.getAttribute("type") === "application/octet-stream") continue;
    const hash = createHash("sha256").update(script.textContent ?? "").digest("base64");
    assert.ok(policy.includes(`'sha256-${hash}'`));
  }
  for (const text of ["Res1n", "Imagigoo", "CC BY", "fb-vehicle-data", "fb-rim-data", "fireballIntegration"]) assert.ok(html.includes(text));
});
