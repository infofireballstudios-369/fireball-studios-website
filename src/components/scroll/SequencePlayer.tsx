"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getFramePath, getVideoPath } from "@/lib/assetManifest";
import { createFrameStore } from "@/lib/frameStore";
import { cn } from "@/lib/utils";
import { SequenceStory, type StoryChapter } from "./SequenceStory";

type SequencePlayerProps = {
  sequenceId: number;
  totalFrames: number;
  frameDirectory?: string;
  poster?: string;
  children?: ReactNode;
  id?: string;
  className?: string;
};

export function SequencePlayer(props: SequencePlayerProps | { chapters: readonly StoryChapter[] }) {
  return "chapters" in props ? <SequenceStory chapters={props.chapters} /> : <SingleSequencePlayer {...props} />;
}

function SingleSequencePlayer({ sequenceId, totalFrames, frameDirectory, poster, children, id, className }: SequencePlayerProps) {
  if (!Number.isInteger(sequenceId) || sequenceId < 1 || sequenceId > 6) throw new RangeError("sequenceId must be an integer from 1 to 6");
  if (!Number.isInteger(totalFrames) || totalFrames < 0) throw new RangeError("totalFrames must be a non-negative integer");

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<{ key: string; status: "ready" | "fallback" } | null>(null);
  const key = sequenceId + ":" + totalFrames + ":" + (frameDirectory ?? "");
  const status = totalFrames === 0 ? "fallback" : result?.key === key ? result.status : "loading";

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || totalFrames === 0) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    const paths = Array.from({ length: totalFrames }, (_, index) => frameDirectory
      ? frameDirectory + "/" + sequenceId + "." + (index + 1) + ".webp"
      : getFramePath(sequenceId, index + 1));
    const controller = new AbortController();
    const store = createFrameStore(paths, controller.signal, window.innerWidth < 700 ? 8 : 14);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let started = false;
    let frameRequest = 0;
    let forceRedraw = false;
    let requestedIndex = 0;
    let renderedIndex = -1;
    let resizeObserver: ResizeObserver | undefined;
    let observer: IntersectionObserver | undefined;
    let trigger: ScrollTrigger | undefined;

    const draw = () => {
      frameRequest = 0;
      const available = store.nearest(requestedIndex);
      if (!context || !available) return;
      if (available.index === renderedIndex && !forceRedraw) return;
      forceRedraw = false;
      const { frame } = available;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const scale = Math.min(width / frame.width, height / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      context.clearRect(0, 0, width, height);
      context.drawImage(frame.source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      canvas.dataset.frame = String(available.index + 1);
      renderedIndex = available.index;
    };
    const scheduleDraw = (force = false) => {
      forceRedraw ||= force;
      if (!cancelled && !frameRequest) frameRequest = window.requestAnimationFrame(draw);
    };
    const requestFrame = (index: number) => {
      requestedIndex = Math.max(0, Math.min(totalFrames - 1, index));
      scheduleDraw();
      void store.get(requestedIndex, true).then(() => { if (!cancelled) scheduleDraw(); });
      if (!reducedMotion.matches) {
        for (const offset of [-2, -1, 1, 2]) void store.get(requestedIndex + offset);
      }
    };
    const syncMotion = () => {
      trigger?.kill();
      if (reducedMotion.matches) {
        requestFrame(0);
        return;
      }
      void store.preload();
      gsap.registerPlugin(ScrollTrigger);
      const headerHeight = () => parseFloat(getComputedStyle(section).getPropertyValue("--header-height")) || 0;
      trigger = ScrollTrigger.create({
        trigger: section,
        start: () => "top " + headerHeight(),
        end: () => "bottom " + (headerHeight() + canvas.clientHeight),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          requestFrame(Math.round(self.progress * (totalFrames - 1)));
          if (progressRef.current) progressRef.current.style.transform = "scaleX(" + self.progress + ")";
        },
      });
      requestFrame(Math.round(trigger.progress * (totalFrames - 1)));
    };
    const start = async () => {
      if (started) return;
      started = true;
      observer?.disconnect();
      let first = await store.get(0);
      for (let index = 1; !first && !cancelled && index < totalFrames; index++) first = await store.get(index);
      if (cancelled) return;
      if (!context || !first) { setResult({ key, status: "fallback" }); return; }
      setResult({ key, status: "ready" });
      resizeObserver = new ResizeObserver(() => scheduleDraw(true));
      resizeObserver.observe(canvas);
      scheduleDraw(true);
      syncMotion();
      reducedMotion.addEventListener("change", syncMotion);
    };

    if (typeof IntersectionObserver === "undefined") void start();
    else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void start();
      }, { rootMargin: "400px 0px" });
      observer.observe(section);
    }
    return () => {
      cancelled = true;
      controller.abort();
      store.dispose();
      observer?.disconnect();
      resizeObserver?.disconnect();
      trigger?.kill();
      reducedMotion.removeEventListener("change", syncMotion);
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
    };
  }, [sequenceId, totalFrames, frameDirectory, key]);

  return (
    <section ref={sectionRef} id={id} className={cn("scroll-scene", className)} data-total-frames={totalFrames}>
      <div className="scene-sticky">
        {/* A complete still is visible before hydration and while nearby frames load. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="scene-fallback" src={poster ?? getFramePath(sequenceId, 1)} alt="" aria-hidden="true" fetchPriority="high" />
        <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />
        <div className="scene-shade" />
        <div className="scene-content">{children}{status === "fallback" && <a className="text-link" href={getVideoPath(sequenceId)} target="_blank" rel="noopener noreferrer">Watch the film on Vimeo<span className="sr-only"> (opens in a new tab)</span></a>}</div>
        {status === "loading" && <span className="sequence-status" role="status">Preparing your perspective…</span>}
        <div className="sequence-track" aria-hidden="true"><span ref={progressRef} /></div>
      </div>
    </section>
  );
}
