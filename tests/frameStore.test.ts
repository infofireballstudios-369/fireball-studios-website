import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { createFrameStore } from "../src/lib/frameStore";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const paths = Array.from({ length: 64 }, (_, index) => String(index));

function controlledDecodes(t: TestContext, immediate = false) {
  const originalFetch = globalThis.fetch;
  const originalBitmap = globalThis.createImageBitmap;
  const started: number[] = [];
  const closed: number[] = [];
  const completions = new Map<number, () => void>();
  let active = 0;
  let peak = 0;
  globalThis.fetch = async (input) => new Response(String(input));
  globalThis.createImageBitmap = (async (source: ImageBitmapSource) => {
    const index = Number(await (source as Blob).text());
    started.push(index);
    peak = Math.max(peak, ++active);
    const bitmap = { width: 1280, height: 720, close: () => closed.push(index) } as unknown as ImageBitmap;
    if (immediate) { active--; return bitmap; }
    return new Promise<ImageBitmap>((resolve) => {
      completions.set(index, () => {
        active--;
        resolve(bitmap);
      });
    });
  }) as typeof createImageBitmap;
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.createImageBitmap = originalBitmap;
  });
  return { started, closed, peak: () => peak, finish: (index: number) => {
    const complete = completions.get(index);
    assert.ok(complete, `Frame ${index} should have started decoding`);
    completions.delete(index);
    complete();
  } };
}

test("decodes at most two frames at once and prioritises the requested frame over queued neighbours", async (t) => {
  const mock = controlledDecodes(t);
  const store = createFrameStore(paths, new AbortController().signal, 4);
  t.after(() => store.dispose());
  const requests = [store.get(0), store.get(1), store.get(2), store.get(3, true)];
  await tick();
  assert.deepEqual(mock.started, [0, 1]);
  mock.finish(0);
  await tick();
  assert.deepEqual(mock.started, [0, 1, 3]);
  mock.finish(1);
  await tick();
  assert.deepEqual(mock.started, [0, 1, 3, 2]);
  mock.finish(3);
  mock.finish(2);
  await Promise.all(requests);
  assert.equal(mock.peak(), 2);
  assert.equal(store.nearest(3)?.index, 3);
});

test("a large scroll jump cancels obsolete queued work and releases late frames outside the cache window", async (t) => {
  const mock = controlledDecodes(t);
  const store = createFrameStore(paths, new AbortController().signal, 2);
  t.after(() => store.dispose());
  const first = store.get(0, true);
  const neighbour = store.get(1);
  await tick();
  const obsolete = store.get(2);
  const target = store.get(50, true);
  assert.equal(await obsolete, null);
  mock.finish(0);
  await tick();
  mock.finish(1);
  mock.finish(50);
  await Promise.all([first, neighbour, target]);
  assert.deepEqual(mock.started, [0, 1, 50]);
  assert.deepEqual(mock.closed.sort((a, b) => a - b), [0, 1]);
  assert.equal(store.nearest(50)?.index, 50);
});

test("disposing settles queued requests and releases bitmaps that finish afterwards", async (t) => {
  const mock = controlledDecodes(t);
  const store = createFrameStore(paths, new AbortController().signal, 2);
  const requests = [store.get(0), store.get(1), store.get(2)];
  await tick();
  store.dispose();
  assert.deepEqual(await Promise.all(requests), [null, null, null]);
  mock.finish(0);
  mock.finish(1);
  await tick();
  assert.deepEqual(mock.started, [0, 1]);
  assert.deepEqual(mock.closed.sort((a, b) => a - b), [0, 1]);
  assert.equal(store.nearest(0), null);
  assert.equal(await store.get(3), null);
});

test("disposing a store aborts its preload requests without aborting another store sharing the parent signal", async (t) => {
  const mock = controlledDecodes(t, true);
  const signals = new Map<string, AbortSignal>();
  globalThis.fetch = (input, options) => {
    const signal = options?.signal;
    assert.ok(signal);
    signals.set(String(input), signal);
    return new Promise<Response>((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  };
  const parent = new AbortController();
  const first = createFrameStore(paths.slice(0, 8), parent.signal);
  const second = createFrameStore(["50"], parent.signal);
  t.after(() => { first.dispose(); second.dispose(); });
  const preload = first.preload();
  assert.equal(first.preload(), preload);
  const current = second.get(0, true);
  await tick();
  assert.equal(signals.size, 5);
  first.dispose();
  await preload;
  assert.equal(parent.signal.aborted, false);
  for (const index of ["0", "1", "2", "3"]) assert.equal(signals.get(index)?.aborted, true);
  assert.equal(signals.get("50")?.aborted, false);
  assert.equal(signals.size, 5, "disposing must stop the remaining preload work");
  parent.abort();
  assert.equal(await current, null);
  assert.equal(signals.get("50")?.aborted, true);
  assert.deepEqual(mock.started, []);
});

test("a deadline frees both slots from stalled old fetches so the latest frame can render", { timeout: 1_000 }, async (t) => {
  const mock = controlledDecodes(t, true);
  const signals = new Map<string, AbortSignal>();
  globalThis.fetch = (input, options) => {
    const signal = options?.signal;
    assert.ok(signal);
    signals.set(String(input), signal);
    // Deliberately ignore abort to prove the store also bounds a non-cooperative request.
    return String(input) === "50" ? Promise.resolve(new Response("50")) : new Promise<Response>(() => {});
  };
  const store = createFrameStore(paths, new AbortController().signal, 2, { fetchTimeoutMs: 20 });
  t.after(() => store.dispose());
  const old = [store.get(0), store.get(1)];
  const current = store.get(50, true);
  assert.ok(await current);
  assert.deepEqual(await Promise.all(old), [null, null]);
  assert.equal(signals.get("0")?.aborted, true);
  assert.equal(signals.get("1")?.aborted, true);
  assert.equal(signals.get("50")?.aborted, false);
  assert.deepEqual(mock.started, [50]);
});

test("failed background preloads stay idle until the current frame requests its single retry", async (t) => {
  const mock = controlledDecodes(t, true);
  const attempts = new Map<string, number>();
  globalThis.fetch = async (input) => {
    const index = String(input), attempt = (attempts.get(index) ?? 0) + 1;
    attempts.set(index, attempt);
    return attempt === 1 ? new Response(null, { status: 503 }) : new Response(index);
  };
  const store = createFrameStore(["0", "1"], new AbortController().signal);
  t.after(() => store.dispose());
  await store.preload();
  assert.deepEqual([...attempts.values()], [1, 1]);
  assert.ok(await store.get(0, true));
  assert.equal(attempts.get("0"), 2);
  assert.equal(attempts.get("1"), 1);
  assert.deepEqual(mock.started, [0]);
  assert.ok(await store.get(0, true));
  assert.equal(attempts.get("0"), 2, "a successful retry should remain cached");
});

test("a repeatedly failing current frame gets at most two network attempts", async (t) => {
  controlledDecodes(t, true);
  let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw new TypeError("Temporary network failure"); };
  const store = createFrameStore(["0"], new AbortController().signal);
  t.after(() => store.dispose());
  assert.equal(await store.get(0, true), null);
  await tick();
  assert.equal(await store.get(0, true), null);
  await store.preload();
  assert.equal(attempts, 2);
});
