"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getFramePath, getFramePaths, getVideoPath, sequenceConfigs } from "@/lib/assetManifest";
import { createFrameStore } from "@/lib/frameStore";

import type { StoryChapter } from "@/lib/homeStory";
export type { StoryChapter } from "@/lib/homeStory";

export function SequenceStory({ chapters }: { chapters: readonly StoryChapter[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [states, setStates] = useState<Record<number, "ready" | "fallback">>({});

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || chapters.length === 0) return;
    const context = canvas.getContext("2d");
    if (!context) {
      const timer = window.setTimeout(() => setStates(Object.fromEntries(chapters.map((_, index) => [index, "fallback"]))), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const stores = new Map<number, ReturnType<typeof createFrameStore>>();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 700px)");
    let cancelled = false;
    let currentChapter = 0;
    let currentFrame = 0;
    let drawnKey = "";
    let raf = 0;
    const announced = new Set<number>();
    const failed = new Set<number>();

    const storeFor = (index: number) => {
      let store = stores.get(index);
      if (!store) {
        const chapter = chapters[index];
        store = createFrameStore(getFramePaths(chapter.sequenceId, sequenceConfigs[chapter.sequenceId].frameCount), controller.signal, window.innerWidth < 700 ? 6 : 10);
        stores.set(index, store);
      }
      return store;
    };

    const draw = (force = false) => {
      const available = storeFor(currentChapter).nearest(currentFrame);
      if (!available || cancelled) return;
      const key = currentChapter + ":" + available.index;
      if (!force && key === drawnKey) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const image = available.frame;
      const scale = Math.min(width / image.width, height / image.height);
      context.clearRect(0, 0, width, height);
      context.drawImage(image.source, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
      canvas.dataset.sequence = String(chapters[currentChapter].sequenceId);
      canvas.dataset.frame = String(available.index + 1);
      drawnKey = key;
    };
    const schedule = () => {
      if (!cancelled && !raf) raf = requestAnimationFrame(() => { raf = 0; draw(); });
    };
    const load = (index: number, frame: number) => {
      const store = storeFor(index);
      const complete = (image: Awaited<ReturnType<typeof store.get>>) => {
        if (cancelled || stores.get(index) !== store) return false;
        if (image && !announced.has(index)) {
          announced.add(index);
          failed.delete(index);
          setStates((previous) => ({ ...previous, [index]: "ready" }));
        }
        if (currentChapter === index) schedule();
        return Boolean(image);
      };
      const requests = [store.get(frame, true).then(complete)];
      if (!motion.matches) for (const offset of [-1, 1, 2]) requests.push(store.get(frame + offset).then(complete));
      void Promise.all(requests).then((loaded) => {
        if (cancelled || stores.get(index) !== store || currentChapter !== index || currentFrame !== frame) return;
        if (!loaded.some(Boolean) && !announced.has(index) && !failed.has(index)) {
          failed.add(index);
          setStates((previous) => ({ ...previous, [index]: "fallback" }));
        }
      });
    };
    const update = (progress: number) => {
      const scaled = Math.min(1, Math.max(0, progress)) * chapters.length;
      const index = Math.min(chapters.length - 1, Math.floor(scaled));
      const local = Math.min(1, scaled - index);
      if (index !== currentChapter) {
        currentChapter = index;
        drawnKey = "";
        context.clearRect(0, 0, canvas.width, canvas.height);
        setActive(index);
        const evicted: number[] = [];
        for (const [cachedIndex, store] of stores) {
          if (Math.abs(cachedIndex - index) > 1) {
            stores.delete(cachedIndex);
            store.dispose();
            announced.delete(cachedIndex);
            failed.delete(cachedIndex);
            evicted.push(cachedIndex);
          }
        }
        if (evicted.length) {
          setStates((previous) => {
            const next = { ...previous };
            for (const cachedIndex of evicted) delete next[cachedIndex];
            return next;
          });
        }
      }
      currentFrame = Math.round(local * (sequenceConfigs[chapters[index].sequenceId].frameCount - 1));
      load(index, currentFrame);
      schedule();
      if (!motion.matches) {
        void storeFor(index).preload();
        if (local > 0.6 && index + 1 < chapters.length) void storeFor(index + 1).preload();
      }
      if (progressRef.current) progressRef.current.style.transform = "scaleX(" + progress + ")";
    };
    const sync = () => {
      triggerRef.current?.kill();
      triggerRef.current = null;
      if (motion.matches) { update(0); return; }
      gsap.registerPlugin(ScrollTrigger);
      triggerRef.current = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => update(self.progress),
      });
      update(triggerRef.current.progress);
    };
    const resize = new ResizeObserver(() => { drawnKey = ""; draw(true); });
    resize.observe(canvas);
    sync();
    motion.addEventListener("change", sync);
    return () => {
      cancelled = true;
      controller.abort();
      stores.forEach((store) => store.dispose());
      resize.disconnect();
      motion.removeEventListener("change", sync);
      triggerRef.current?.kill();
      triggerRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [chapters]);

  if (chapters.length === 0) return null;
  return (
    <section ref={sectionRef} className="scroll-story" aria-label="Explore Fireball Studios visualisation" style={{ "--chapter-count": chapters.length } as React.CSSProperties}>
      <div className="story-viewport">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="story-poster" src={states[active] === "fallback" ? "/posters/" + chapters[active].sequenceId + ".webp" : getFramePath(chapters[active].sequenceId, 1)} alt="" aria-hidden="true" fetchPriority="high" />
        <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />
        <div className="story-shade" />
        <div className="story-copy-stack">
          {chapters.map((chapter, index) => (
            <section key={chapter.sequenceId} className={"story-chapter" + (active === index ? " is-active" : "")} aria-label={chapter.eyebrow}>
              <p className="eyebrow"><span /> {chapter.eyebrow}</p>
              {index === 0 ? <h1>{chapter.title}</h1> : <h2>{chapter.title}</h2>}
              <p className="story-description">{chapter.description}</p>
              {chapter.features && <ul className="story-features">{chapter.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>}
              <div className="button-row"><Link className="button button-amber" href="/contact">Start your project <ArrowUpRight size={17} /></Link><Link className="text-link" href="/projects">Explore our work <ArrowUpRight size={17} /></Link>{states[index] === "fallback" && <a className="text-link" href={getVideoPath(chapter.sequenceId)} target="_blank" rel="noopener noreferrer">Watch the film on Vimeo <ArrowUpRight size={17} /><span className="sr-only"> (opens in a new tab)</span></a>}</div>
            </section>
          ))}
        </div>
        <div className="story-footer">
          <span className="scroll-cue"><ArrowDown size={16} aria-hidden="true" /> Scroll to explore</span>
          <nav className="story-checkpoints" aria-label="Visualisation chapters">
            {chapters.map((chapter, index) => <button key={chapter.sequenceId} className={active === index ? "is-active" : ""} aria-label={"Scroll to " + chapter.eyebrow} aria-current={active === index ? "step" : undefined} onClick={() => {
              const trigger = triggerRef.current;
              if (trigger) window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * index / chapters.length + 1, behavior: "smooth" });
            }}><span>0{index + 1}</span>{chapter.eyebrow}</button>)}
          </nav>
        </div>
        {!states[active] && <span className="story-loader" role="status">Loading the view…</span>}
        <div className="story-progress" aria-hidden="true"><span ref={progressRef} /></div>
      </div>
    </section>
  );
}
