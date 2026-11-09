import { getFrameDimensions, getFramePaths, getSequencePoster, getVimeoVideo, isSequenceId, selectSequenceQuality, sequenceConfigs, type FrameQuality, type SequenceId } from "../data/assetManifest";
import { createFrameStore } from "../lib/frame-store";
import type { ScrollTrigger as ScrollTriggerInstance } from "gsap/ScrollTrigger";

/** Include both endpoints and reverse the same frame mapping when the visitor scrolls upwards. */
export function getStoryPosition(progress: number, frameCounts: readonly number[]) {
  const normalised = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const scaled = normalised * frameCounts.length;
  const chapter = Math.min(frameCounts.length - 1, Math.floor(scaled));
  return { chapter, frame: Math.round(Math.min(1, scaled - chapter) * (frameCounts[chapter] - 1)) };
}

/** Measure every chapter, including hidden chapters, before pinning its readable copy. */
export function storyCopyFits(stack: HTMLElement | null, chapters: readonly HTMLElement[]): boolean {
  if (!stack) return true;
  const available = stack?.clientHeight ?? 0;
  if (available <= 0) return false;
  return chapters.every((chapter) => {
    const copy = chapter.querySelector<HTMLElement>(".story-copy");
    return !copy || Math.max(copy.scrollHeight, copy.getBoundingClientRect().height) <= available + 1;
  });
}

/** Enhance the semantic story only when a usable frame and animation support are ready. */
export function initScrollStory(): Promise<() => void> {
  const story = document.querySelector<HTMLElement>("[data-story]");
  const canvas = story?.querySelector<HTMLCanvasElement>("canvas[data-story-canvas]");
  const poster = story?.querySelector<HTMLImageElement>("img[data-story-poster]");
  const nodes = story ? [...story.querySelectorAll<HTMLElement>("[data-story-chapter]")] : [];
  const chapters = nodes.map((node) => ({ node, id: Number(node.dataset.sequence) }));
  if (!story || !canvas || !poster || !chapters.length || chapters.some(({ id }) => !isSequenceId(id))) return Promise.resolve(() => {});
  const context = canvas.getContext("2d");
  const loading = story.querySelector<HTMLElement>("[data-story-loading]");
  if (!context || !window.matchMedia) { if (loading) loading.hidden = true; return Promise.resolve(() => {}); }
  const base = document.body.dataset.assetBase ?? "./";
  const progress = story.querySelector<HTMLElement>("[data-story-progress]");
  const buttons = [...story.querySelectorAll<HTMLButtonElement>("[data-story-target]")];
  const copyStack = story.querySelector<HTMLElement>(".story-copy-stack");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 680px)");
  const originalPoster = { src: poster.getAttribute("src"), srcset: poster.getAttribute("srcset"), sizes: poster.getAttribute("sizes") };
  const initialLoadingText = loading?.textContent || "Preparing the view…";
  const stores = new Map<number, ReturnType<typeof createFrameStore> & { quality: FrameQuality; neighbourRadius: number }>();
  let controller: AbortController | undefined;
  let trigger: ScrollTriggerInstance | undefined;
  let runtime: Promise<typeof import("gsap/ScrollTrigger")> | undefined;
  let active = 0, requested = 0, drawn = "", raf = 0, generation = 0;
  let started = false, enhanced = false, disposed = false, failed = false;
  let observer: IntersectionObserver | undefined;
  let visible = typeof IntersectionObserver !== "function";
  const connection = (window.navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection;
  const qualityFor = (index: number) => selectSequenceQuality(chapters[index].id as SequenceId, {
    viewportWidth: window.innerWidth, pixelRatio: window.devicePixelRatio,
    saveData: connection?.saveData, effectiveType: connection?.effectiveType,
  });
  const setPoster = (index: number) => {
    const image = getSequencePoster(chapters[index].id as SequenceId, base);
    poster.srcset = image.srcset;
    poster.sizes = image.sizes;
    poster.src = image.src;
  };

  const fits = () => {
    // Measure the final pinned geometry without waiting for, or downloading, a frame.
    if (!enhanced) {
      story.style.setProperty("--chapter-count", String(chapters.length));
      story.classList.add("is-enhanced");
      document.body.classList.add("is-enhanced");
    }
    const result = storyCopyFits(copyStack, nodes);
    if (!enhanced) {
      story.classList.remove("is-enhanced");
      document.body.classList.remove("is-enhanced");
    }
    return result;
  };

  const showLoading = (visible: boolean) => {
    if (loading) { loading.hidden = !visible; loading.textContent = initialLoadingText; }
  };
  const restoreCopy = () => {
    enhanced = false;
    story.classList.remove("is-enhanced");
    document.body.classList.remove("is-enhanced");
    for (const { node } of chapters) { node.classList.remove("is-active"); node.removeAttribute("aria-hidden"); node.inert = false; }
    buttons.forEach((button) => button.removeAttribute("aria-current"));
    if (progress) progress.style.transform = "scaleX(0)";
  };
  const stop = () => {
    generation++;
    started = false;
    trigger?.kill();
    trigger = undefined;
    controller?.abort();
    stores.forEach((store) => store.dispose());
    stores.clear();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    drawn = "";
    context.clearRect(0, 0, canvas.width, canvas.height);
    restoreCopy();
  };
  const fallback = (chapterIndex: number) => {
    failed = true;
    stop();
    setPoster(chapterIndex);
    if (loading) {
      const link = document.createElement("a");
      link.href = getVimeoVideo(chapters[chapterIndex].id).watchUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Watch this film on Vimeo (opens in a new tab)";
      loading.replaceChildren(document.createTextNode("The scroll view is unavailable. "), link);
      loading.hidden = false;
    }
  };
  const storeFor = (index: number) => {
    let store = stores.get(index);
    if (!store) {
      const id = chapters[index].id as SequenceId;
      const quality = qualityFor(index);
      const dimensions = getFrameDimensions(id, quality);
      const maxDecodedBytes = (window.innerWidth <= 900 ? 24 : 48) * 1024 * 1024;
      const capacity = Math.max(1, Math.min(12, Math.floor(maxDecodedBytes / (dimensions.width * dimensions.height * 4))));
      store = Object.assign(createFrameStore(getFramePaths(id, base, quality), controller!.signal, capacity, {
        maxDecodedBytes, decodeConcurrency: quality === 3840 ? 1 : 2, expectedFrameBytes: dimensions.width * dimensions.height * 4,
      }), { quality, neighbourRadius: Math.min(2, Math.floor((capacity - 1) / 2)) });
      stores.set(index, store);
    }
    return store;
  };
  const draw = (force = false) => {
    raf = 0;
    if (!enhanced || disposed || motion.matches) return;
    const available = stores.get(active)?.nearest(requested);
    if (!available) return;
    const key = `${active}:${stores.get(active)?.quality}:${available.index}`;
    if (!force && key === drawn) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const frame = available.frame;
    const scale = Math.min(width / frame.width, height / frame.height);
    context.clearRect(0, 0, width, height);
    context.drawImage(frame.source, (width - frame.width * scale) / 2, (height - frame.height * scale) / 2, frame.width * scale, frame.height * scale);
    canvas.dataset.sequence = String(chapters[active].id);
    canvas.dataset.frame = String(available.index + 1);
    drawn = key;
    showLoading(false);
  };
  const schedule = () => { if (!raf && enhanced && !disposed) raf = requestAnimationFrame(() => draw()); };
  const selectChapter = (index: number) => {
    const focusWasHidden = chapters.some(({ node }, chapterIndex) => chapterIndex !== index && node.contains(document.activeElement));
    chapters.forEach(({ node }, chapterIndex) => {
      const selected = chapterIndex === index;
      node.classList.toggle("is-active", selected);
      node.setAttribute("aria-hidden", String(!selected));
      node.inert = !selected;
    });
    buttons.forEach((button) => {
      if (Number(button.dataset.storyTarget) === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (focusWasHidden) buttons.find((button) => Number(button.dataset.storyTarget) === index)?.focus({ preventScroll: true });
  };
  const requestFrame = (index: number, frame: number) => {
    const store = storeFor(index);
    const run = generation;
    const complete = (image: Awaited<ReturnType<typeof store.get>>) => {
      if (disposed || run !== generation || stores.get(index) !== store) return false;
      if (index === active) schedule();
      return Boolean(image);
    };
    const requests = [store.get(frame, true).then(complete)];
    // A small local window supports smooth reversal without downloading the entire film.
    for (let offset = 1; offset <= store.neighbourRadius; offset++) {
      requests.push(store.get(frame - offset).then(complete), store.get(frame + offset).then(complete));
    }
    void Promise.all(requests).then((images) => {
      if (disposed || run !== generation || index !== active || requested !== frame || stores.get(index) !== store) return;
      if (!images.some(Boolean) && !store.nearest(frame)) fallback(index);
    });
  };
  const update = (value: number) => {
    if (!enhanced) return;
    const position = getStoryPosition(value, chapters.map(({ id }) => sequenceConfigs[id as SequenceId].frameCount));
    const index = position.chapter;
    if (index !== active) {
      active = index;
      drawn = "";
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const [key, store] of stores) if (key !== index) { stores.delete(key); store.dispose(); }
      setPoster(index);
      selectChapter(index);
      showLoading(true);
    }
    requested = position.frame;
    requestFrame(index, requested);
    schedule();
    if (progress) progress.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
  };
  const start = async () => {
    if (disposed || failed || started || motion.matches || !visible) return;
    if (!fits()) { restoreCopy(); showLoading(false); return; }
    started = true;
    const run = ++generation;
    controller = new AbortController();
    active = 0;
    requested = 0;
    showLoading(true);
    try {
      runtime ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, plugin]) => {
        gsap.registerPlugin(plugin.ScrollTrigger);
        return plugin;
      });
      const [plugin, first] = await Promise.all([runtime, storeFor(0).get(0, true)]);
      if (disposed || run !== generation || motion.matches) return;
      if (!first) { fallback(0); return; }
      enhanced = true;
      story.style.setProperty("--chapter-count", String(chapters.length));
      story.classList.add("is-enhanced");
      document.body.classList.add("is-enhanced");
      if (!fits()) { stop(); showLoading(false); return; }
      selectChapter(0);
      trigger = plugin.ScrollTrigger.create({ trigger: story, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
        onUpdate: (self) => update(self.progress), onRefresh: (self) => update(self.progress) });
      update(trigger.progress);
      draw(true);
      void document.fonts?.ready.then(() => {
        if (disposed || run !== generation) return;
        if (!fits()) { stop(); showLoading(false); }
        else trigger?.refresh();
      });
    } catch { if (!disposed && run === generation) fallback(0); }
  };
  const sync = () => {
    if (motion.matches) { stop(); showLoading(false); return; }
    void start();
  };
  const onTarget = (event: Event) => {
    const index = Number((event.currentTarget as HTMLButtonElement).dataset.storyTarget);
    if (trigger && Number.isInteger(index) && index >= 0 && index < chapters.length) {
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * index / chapters.length + 1, behavior: "smooth" });
    }
  };
  const onResize = () => {
    if (disposed) return;
    if (enhanced && !fits()) { stop(); showLoading(false); return; }
    const current = stores.get(active);
    if (enhanced && current && current.quality !== qualityFor(active)) {
      current.dispose();
      stores.delete(active);
      drawn = "";
      requestFrame(active, requested);
    }
    if (!started) sync();
    else draw(true);
  };
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : undefined;
  resize?.observe(canvas);
  if (copyStack) resize?.observe(copyStack);
  for (const { node } of chapters) {
    const copy = node.querySelector<HTMLElement>(".story-copy");
    if (copy) resize?.observe(copy);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("fireball:header-resize", onResize);
  connection?.addEventListener("change", onResize);
  buttons.forEach((button) => button.addEventListener("click", onTarget));
  motion.addEventListener("change", sync);
  const onPageHide = () => stop();
  const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) sync(); };
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  showLoading(false);
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { visible = true; observer?.disconnect(); sync(); }
    }, { rootMargin: "300px 0px" });
    observer.observe(story);
  } else sync();

  return Promise.resolve(() => {
    disposed = true;
    stop();
    showLoading(false);
    observer?.disconnect();
    resize?.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("fireball:header-resize", onResize);
    connection?.removeEventListener("change", onResize);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    motion.removeEventListener("change", sync);
    buttons.forEach((button) => button.removeEventListener("click", onTarget));
    for (const [attribute, value] of Object.entries(originalPoster)) {
      if (value === null) poster.removeAttribute(attribute); else poster.setAttribute(attribute, value);
    }
  });
}
