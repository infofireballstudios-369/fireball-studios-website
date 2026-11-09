import assert from "node:assert/strict";
import test from "node:test";
import { initHeaderSizing, measuredHeaderHeight } from "../src/components/header-size.ts";

/* Manual layout review still required at 1440×900, 1366×681, 900×700,
   390×844, 375×700 and 320×568, plus 200% text zoom and wrapped navigation.
   The eyebrow must clear the header by 24px; overflowing chapters use the static
   story instead of shrinking below the readable minimum or hiding the heading. */

function environment({ height = 92, present = true, previous = "" } = {}) {
  const names = ["document", "window", "ResizeObserver"] as const;
  const originals = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const styles = new Map<string, { value: string; priority: string }>();
  if (previous) styles.set("--header-height", { value: previous, priority: "important" });
  const style = {
    getPropertyValue: (name: string) => styles.get(name)?.value ?? "",
    getPropertyPriority: (name: string) => styles.get(name)?.priority ?? "",
    setProperty: (name: string, value: string, priority = "") => styles.set(name, { value, priority }),
    removeProperty: (name: string) => styles.delete(name),
  };
  let currentHeight = height;
  const header = { getBoundingClientRect: () => ({ height: currentHeight }) };
  const events = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let changed = 0;
  let disconnected = 0;
  let observed: unknown;
  let observedResize: (() => void) | undefined;
  let fontsReady: (() => void) | undefined;
  events.addEventListener("fireball:header-resize", () => changed++);
  const document = {
    documentElement: { style },
    querySelector: () => present ? header : null,
    fonts: { ready: new Promise<void>((resolve) => { fontsReady = resolve; }) },
  };
  const window = {
    addEventListener: events.addEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    requestAnimationFrame(callback: FrameRequestCallback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  };
  class ResizeObserver {
    constructor(callback: () => void) { observedResize = callback; }
    observe(element: unknown) { observed = element; }
    disconnect() { disconnected++; }
  }
  for (const [name, value] of Object.entries({ document, window, ResizeObserver })) Object.defineProperty(globalThis, name, { configurable: true, value });
  return {
    header, style, frames,
    get changed() { return changed; },
    get disconnected() { return disconnected; },
    get observed() { return observed; },
    setHeight(value: number) { currentHeight = value; },
    resize() { observedResize?.(); },
    windowResize() { events.dispatchEvent(new Event("resize")); },
    finishFonts() { fontsReady?.(); },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(0)); },
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test("header measurement rounds upwards and ignores impossible layout measurements", () => {
  assert.equal(measuredHeaderHeight(80), 80);
  assert.equal(measuredHeaderHeight(92.1), 93);
  assert.equal(measuredHeaderHeight(276.2), 277, "wrapped or enlarged headers must reserve their actual height");
  for (const height of [0, -1, NaN, Infinity, -Infinity, 20000]) assert.equal(measuredHeaderHeight(height), undefined);
});

test("header sizing measures immediately, coalesces changes and notifies the story only on a real change", () => {
  const env = environment({ height: 80.25 });
  let dispose: (() => void) | undefined;
  try {
    dispose = initHeaderSizing();
    assert.equal(env.observed, env.header);
    assert.equal(env.style.getPropertyValue("--header-height"), "81px");
    assert.equal(env.changed, 1);
    env.setHeight(128.2);
    env.resize();
    env.resize();
    env.windowResize();
    assert.equal(env.frames.size, 1);
    env.flush();
    assert.equal(env.style.getPropertyValue("--header-height"), "129px");
    assert.equal(env.changed, 2);
    env.resize();
    env.flush();
    assert.equal(env.changed, 2);
    env.setHeight(NaN);
    env.resize();
    env.flush();
    assert.equal(env.style.getPropertyValue("--header-height"), "129px");
  } finally { dispose?.(); env.restore(); }
});

test("cleanup cancels work, disconnects observation and restores the previous inline setting", async () => {
  const env = environment({ previous: "110px" });
  let dispose: (() => void) | undefined;
  try {
    dispose = initHeaderSizing();
    env.resize();
    assert.equal(env.frames.size, 1);
    dispose();
    dispose();
    assert.equal(env.disconnected, 1);
    assert.equal(env.frames.size, 0);
    assert.equal(env.style.getPropertyValue("--header-height"), "110px");
    assert.equal(env.style.getPropertyPriority("--header-height"), "important");
    env.resize();
    env.windowResize();
    env.finishFonts();
    await Promise.resolve();
    assert.equal(env.frames.size, 0, "late font and observer callbacks cannot revive a stopped component");
  } finally { dispose?.(); env.restore(); }
});

test("font completion remeasures a wrapped header and reinitialisation replaces the earlier observer", async () => {
  const env = environment();
  let dispose: (() => void) | undefined;
  try {
    initHeaderSizing();
    env.setHeight(144.5);
    env.finishFonts();
    await Promise.resolve();
    env.flush();
    assert.equal(env.style.getPropertyValue("--header-height"), "145px");
    dispose = initHeaderSizing();
    assert.equal(env.disconnected, 1);
    env.style.setProperty("--header-height", "200px");
    dispose();
    assert.equal(env.style.getPropertyValue("--header-height"), "200px", "cleanup must not overwrite another owner’s subsequent setting");
  } finally { dispose?.(); env.restore(); }
});

test("pages without a header leave styles and observers untouched", () => {
  const env = environment({ present: false, previous: "100px" });
  try {
    const dispose = initHeaderSizing();
    assert.equal(env.observed, undefined);
    assert.equal(env.style.getPropertyValue("--header-height"), "100px");
    dispose();
    assert.equal(env.frames.size, 0);
  } finally { env.restore(); }
});
