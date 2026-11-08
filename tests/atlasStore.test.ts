import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import sharp from "sharp";
import { budgetSequenceConfigs, homeSequenceIds, sequenceConfigs } from "../src/lib/assetManifest";
import { createAtlasStore } from "../src/lib/atlasStore";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

function mockImages(t: TestContext) {
  const originalFetch = globalThis.fetch;
  const originalBitmap = globalThis.createImageBitmap;
  const requested: string[] = [];
  const live = new Set<string>();
  const closed: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    return new Response(url);
  };
  globalThis.createImageBitmap = (async (source: ImageBitmapSource) => {
    const url = await (source as Blob).text();
    live.add(url);
    return { width: 1200, height: 1014, close: () => { live.delete(url); closed.push(url); } } as unknown as ImageBitmap;
  }) as typeof createImageBitmap;
  t.after(() => { globalThis.fetch = originalFetch; globalThis.createImageBitmap = originalBitmap; });
  return { requested, live, closed };
}

test("homepage atlases cover the original camera moves with twelve hashed files under the media budget", async () => {
  let bytes = 0;
  let requests = 0;
  for (const id of homeSequenceIds) {
    const config = budgetSequenceConfigs[id];
    assert.equal(config.frameCount, 24);
    assert.equal(config.sourceFrameCount, sequenceConfigs[id].frameCount);
    assert.equal(config.sourceFrameIndices.length, config.frameCount);
    assert.equal(config.sourceFrameIndices[0], 1);
    assert.equal(config.sourceFrameIndices.at(-1), config.sourceFrameCount);
    assert.ok(config.sourceFrameIndices.every((frame, index, frames) => index === 0 || frame > frames[index - 1]));
    assert.equal(config.atlasPaths.length * config.columns * config.rows, config.frameCount);
    let sequenceBytes = 0;
    for (const url of config.atlasPaths) {
      const image = await readFile(join(process.cwd(), "public", url));
      const digest = createHash("sha256").update(image).digest("hex").slice(0, 8);
      assert.ok(url.endsWith(`.${digest}.webp`), "immutable filenames must match their actual content");
      const metadata = await sharp(image).metadata();
      assert.equal(metadata.width, config.columns * config.frameWidth);
      assert.equal(metadata.height, config.rows * config.frameHeight);
      sequenceBytes += image.length;
      requests++;
    }
    assert.equal(sequenceBytes, config.encodedBytes);
    bytes += sequenceBytes;
  }
  assert.equal(requests, 12);
  assert.ok(bytes <= 850_000, `Homepage atlas payload ${bytes} exceeds its 850 KB guard`);
});

test("every sampled frame maps to its correct crop in both directions with only four downloads per chapter", async (t) => {
  const mock = mockImages(t);
  for (const id of homeSequenceIds) {
    const config = budgetSequenceConfigs[id];
    const before = mock.requested.length;
    const store = createAtlasStore(config, new AbortController().signal);
    assert.equal(mock.requested.length, before, "constructing a store must not start downloads");
    assert.equal(store.nearest(0), null);
    const forward = Array.from({ length: config.frameCount }, (_, index) => index);
    for (const index of [...forward, ...forward.toReversed()]) {
      const frame = await store.get(index, true);
      assert.ok(frame);
      const tile = index % (config.columns * config.rows);
      assert.deepEqual(frame.crop, {
        x: tile % config.columns * config.frameWidth,
        y: Math.floor(tile / config.columns) * config.frameHeight,
        width: config.frameWidth,
        height: config.frameHeight,
      });
      assert.equal(store.nearest(index)?.index, index);
      assert.ok(mock.live.size <= 2, "at most two decoded sheets should remain cached");
    }
    assert.equal(mock.requested.length - before, 4);
    assert.equal(await store.get(-1), null);
    assert.equal(await store.get(config.frameCount), null);
    store.dispose();
    assert.equal(mock.live.size, 0);
    assert.equal(store.nearest(0), null);
  }
  assert.equal(mock.requested.length, 12);
  assert.equal(new Set(mock.requested).size, 12);
});

test("frames sharing a sheet deduplicate requests and missing sheets use the nearest frame boundary", async (t) => {
  const mock = mockImages(t);
  const config = budgetSequenceConfigs[3];
  const store = createAtlasStore(config, new AbortController().signal);
  t.after(() => store.dispose());
  await Promise.all([store.get(0, true), store.get(1), store.get(5)]);
  assert.equal(mock.requested.length, 1);
  await store.get(12, true);
  assert.equal(mock.requested.length, 2);
  assert.equal(store.nearest(6)?.index, 5);
  assert.equal(store.nearest(11)?.index, 12);
});

test("leaving a chapter aborts its pending atlas and does not begin neighbouring downloads", async (t) => {
  const mock = mockImages(t);
  let requestSignal: AbortSignal | undefined;
  globalThis.fetch = (input, options) => {
    mock.requested.push(String(input));
    requestSignal = options?.signal ?? undefined;
    return new Promise<Response>(() => {});
  };
  const parent = new AbortController();
  const store = createAtlasStore(budgetSequenceConfigs[3], parent.signal);
  const current = store.get(0, true);
  await tick();
  assert.equal(mock.requested.length, 1);
  store.dispose();
  assert.equal(await current, null);
  assert.equal(requestSignal?.aborted, true);
  assert.equal(parent.signal.aborted, false);
  assert.equal(mock.live.size, 0);
  assert.equal(await store.get(6, true), null);
  assert.equal(mock.requested.length, 1);
});
