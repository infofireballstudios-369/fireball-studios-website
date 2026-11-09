import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { getFrameDimensions, getFramePath, getFramePaths, getSequencePoster, selectSequenceQuality, type FrameQuality, type SequenceId } from "../src/data/assetManifest";

test("quality follows viewport and data preferences without upscaling the product film", () => {
  const select = (width: number, pixelRatio = 1) => selectSequenceQuality(3, { viewportWidth: width, pixelRatio });
  assert.equal(select(900, 3), 1280);
  assert.equal(select(901), 1920);
  assert.equal(select(1920), 1920);
  assert.equal(select(1800, 2), 2560);
  assert.equal(select(2399, 2), 2560);
  assert.equal(select(2400, 1), 1920);
  assert.equal(select(2400, 2), 3840);
  assert.equal(select(3200), 3840);
  for (const preference of [{ saveData: true }, { effectiveType: "2g" }, { effectiveType: "slow-2g" }]) {
    assert.equal(selectSequenceQuality(6, { viewportWidth: 3840, pixelRatio: 2, ...preference }), 1280);
  }
  assert.equal(selectSequenceQuality(5, { viewportWidth: 3840, pixelRatio: 2 }), 1920);
  assert.equal(selectSequenceQuality(4, { viewportWidth: 3840, pixelRatio: 2 }), 1280);
  assert.throws(() => getFramePath(5, 1, 2560), RangeError);
  assert.equal(getFramePaths(6, "../../", 3840)[95], "../../frames/quality/6/3840/6.96.webp");
  assert.deepEqual(getFrameDimensions(5, 1920), { width: 1920, height: 1000 });
});

test("every quality variant has 96 matching files and genuine source timing; endpoint images decode", async () => {
  const manifest = JSON.parse(await readFile("public/media-manifest.json", "utf8"));
  const expected = { 3: { start: 3, fps: 12 }, 6: { start: 7.6, fps: 18 }, 5: { start: 15, fps: 12 } };
  for (const [key, timing] of Object.entries(expected)) {
    const id = Number(key) as SequenceId;
    const entry = manifest.quality.sequences[id];
    assert.equal(entry.frameCount, 96);
    assert.equal(entry.startSeconds, timing.start);
    assert.equal(entry.framesPerSecond, timing.fps);
    assert.equal(entry.durationSeconds, 96 / timing.fps);
    assert.ok(!entry.source.startsWith("/"), "provenance must not expose an absolute local path");
    for (const [width, variant] of Object.entries(entry.variants) as [string, { files: { path: string; bytes: number; sha256: string }[]; bytes: number }][]) {
      const quality = Number(width) as FrameQuality;
      assert.equal((await readdir(`public/frames/quality/${id}/${quality}`)).length, 96);
      assert.equal(variant.files.length, 96);
      let bytes = 0;
      for (let index = 0; index < 96; index++) {
        const file = variant.files[index];
        assert.equal(file.path, getFramePath(id, index + 1, quality));
        const image = await readFile(`public/${file.path}`);
        bytes += image.length;
        assert.equal(image.length, file.bytes);
        assert.equal(createHash("sha256").update(image).digest("hex"), file.sha256);
        if (index === 0 || index === 95) {
          const metadata = await sharp(image).metadata();
          assert.equal(metadata.width, quality);
          assert.equal(metadata.height, getFrameDimensions(id, quality).height);
          await sharp(image).resize(1, 1).raw().toBuffer();
        }
      }
      assert.equal(bytes, variant.bytes);
    }
  }
});

test("responsive posters reference shipped clean stills at their genuine maximum resolution", async () => {
  const manifest = JSON.parse(await readFile("public/media-manifest.json", "utf8"));
  for (const id of [3, 5, 6] as const) {
    const poster = getSequencePoster(id, "../");
    assert.equal(poster.sizes, "100vw");
    for (const item of poster.srcset.split(", ")) {
      const [url, descriptor] = item.split(" ");
      const bytes = await readFile(`public/${url.slice(3)}`);
      assert.equal((await sharp(bytes).metadata()).width, Number(descriptor.slice(0, -1)));
    }
  }
  assert.equal(getSequencePoster(3).width, 1920);
  assert.equal(getSequencePoster(5).width, 1920);
  assert.equal(getSequencePoster(6).width, 3840);
  assert.equal(manifest.quality.posters[3].source, "Projects/Images/3.5.webp");
  assert.equal(manifest.quality.posters[5].source, "Projects/Images/5.2.png");
  assert.deepEqual(await readFile("public/images/posters/quality/3/3-1920.webp"), await readFile("public/images/projects/3/3.5.webp"));
});
