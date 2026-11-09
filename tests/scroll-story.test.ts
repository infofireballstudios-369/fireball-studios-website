import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { getStoryPosition, initScrollStory } from "../src/components/scroll-story";

test("scroll mapping reaches every chapter endpoint and reverses without an off-by-one frame", () => {
  const frames = [96, 96, 96];
  assert.deepEqual(getStoryPosition(0, frames), { chapter: 0, frame: 0 });
  assert.deepEqual(getStoryPosition(1 / 3 - 0.000001, frames), { chapter: 0, frame: 95 });
  assert.deepEqual(getStoryPosition(1 / 3, frames), { chapter: 1, frame: 0 });
  assert.deepEqual(getStoryPosition(2 / 3, frames), { chapter: 2, frame: 0 });
  assert.deepEqual(getStoryPosition(1, frames), { chapter: 2, frame: 95 });
  const backwards = [1, 0.9, 0.8, 0.7].map((progress) => getStoryPosition(progress, frames).frame);
  assert.ok(backwards.every((frame, index) => index === 0 || frame < backwards[index - 1]));
  assert.deepEqual(getStoryPosition(-1, frames), getStoryPosition(0, frames));
  assert.deepEqual(getStoryPosition(2, frames), getStoryPosition(1, frames));
});

for (const mode of [
  { name: "reduced motion", reduced: true, height: 900, overflow: false },
  { name: "a short viewport", reduced: false, height: 680, overflow: false },
  { name: "copy larger than the available pinned area", reduced: false, height: 900, overflow: true },
]) {
  test(`${mode.name} keeps every semantic chapter available and requests no animation frames`, async (t) => {
    const { window, document } = parseHTML(`<html><body data-asset-base="../"><section data-story><div class="story-stage"><img data-story-poster src="../images/posters/3.webp"><canvas data-story-canvas></canvas><div class="story-copy-stack"><section data-story-chapter data-sequence="3"><h1>First chapter</h1></section><section data-story-chapter data-sequence="6"><h2>Second chapter</h2></section><section data-story-chapter data-sequence="5"><h2>Third chapter</h2></section></div><button data-story-target="0">First</button><span data-story-progress></span><p data-story-loading>Preparing the view</p></div></section></body></html>`);
    let requests = 0;
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const globals: Record<string, unknown> = {
      window, document, ResizeObserver: undefined, IntersectionObserver: undefined,
      fetch: async () => { requests++; throw new Error("Static mode must not fetch frames"); },
    };
    for (const [key, value] of Object.entries(globals)) {
      originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    t.after(() => {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
      }
    });
    const changeListeners = new Set<() => void>();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: (mode.reduced && query.includes("prefers-reduced-motion: reduce"))
          || (mode.height <= 680 && query.includes("max-height: 680px")),
        addEventListener(type: string, listener: () => void) { if (type === "change") changeListeners.add(listener); },
        removeEventListener(type: string, listener: () => void) { if (type === "change") changeListeners.delete(listener); },
      }),
    });
    Object.defineProperty(document.querySelector("canvas"), "getContext", { value: () => ({ clearRect() {} }) });
    if (mode.overflow) {
      Object.defineProperty(document.querySelector(".story-copy-stack"), "clientHeight", { value: 450 });
      for (const chapter of document.querySelectorAll("[data-story-chapter]")) {
        const copy = document.createElement("div");
        copy.className = "story-copy";
        copy.append(...chapter.childNodes);
        chapter.append(copy);
        Object.defineProperty(copy, "scrollHeight", { value: 640 });
        Object.defineProperty(copy, "getBoundingClientRect", { value: () => ({ height: 640 }) });
      }
    }
    const cleanup = await initScrollStory();
    assert.equal(changeListeners.size, 1);
    for (const listener of changeListeners) listener();
    assert.equal(requests, 0);
    assert.equal(document.body.classList.contains("is-enhanced"), false);
    const chapters = [...document.querySelectorAll<HTMLElement>("[data-story-chapter]")];
    assert.equal(chapters.length, 3);
    for (const chapter of chapters) {
      assert.equal(chapter.hasAttribute("aria-hidden"), false);
      assert.equal(chapter.inert, false);
    }
    assert.equal(document.querySelector<HTMLElement>("[data-story-loading]")?.hidden, true);
    cleanup();
    assert.equal(changeListeners.size, 0);
    assert.equal(document.querySelector("[data-story-poster]")?.getAttribute("src"), "../images/posters/3.webp");
  });
}
