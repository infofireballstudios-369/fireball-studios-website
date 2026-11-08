"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, Play, RotateCcw } from "lucide-react";
import type { VimeoVideo } from "@/lib/assetManifest";

interface VimeoPlayerProps {
  video: VimeoVideo;
  title: string;
  poster: string;
  posterAlt?: string;
  className?: string;
  /** Use only when mounting a player after an explicit Watch film action. */
  playOnOpen?: boolean;
}

/** No third-party connection is made until the visitor requests playback. */
export function VimeoPlayer({ video, title, poster, posterAlt = "", className = "", playOnOpen = false }: VimeoPlayerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(playOnOpen ? "loading" : "idle");
  const [attempt, setAttempt] = useState(0);
  const isMounted = status === "loading" || status === "ready";

  useEffect(() => {
    if (status !== "loading") return;
    const timeout = window.setTimeout(() => setStatus("error"), 15000);
    return () => window.clearTimeout(timeout);
  }, [status, attempt]);

  const play = () => { setAttempt((previous) => previous + 1); setStatus("loading"); };

  return (
    <div className={"vimeo-player " + className}>
      <div className="vimeo-stage" style={{ aspectRatio: "16 / 9" }}>
        {!isMounted && <Image className="vimeo-poster" src={poster} alt={posterAlt} fill sizes="(max-width: 800px) 94vw, 1200px" />}
        {status === "idle" && <button className="vimeo-play-button" type="button" onClick={play} aria-label={"Watch " + title}><Play size={20} aria-hidden="true" /> Watch film</button>}
        {isMounted && <iframe
          key={video.id + ":" + attempt}
          className="vimeo-frame"
          src={video.embedUrl + "?autoplay=1&dnt=1&title=0&byline=0&portrait=0"}
          title={title + " — project film"}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
        />}
        {status === "loading" && <p className="vimeo-status" role="status">Loading the film…</p>}
        {status === "error" && <div className="vimeo-error" role="status"><p>The embedded player could not load. Try again or watch directly on Vimeo.</p><button className="button button-amber" type="button" onClick={play}><RotateCcw size={16} aria-hidden="true" /> Try again</button></div>}
      </div>
      <div className="vimeo-caption"><span>Film hosted on Vimeo</span><a className="text-link" href={video.watchUrl} target="_blank" rel="noopener noreferrer">Watch on Vimeo <ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></div>
    </div>
  );
}
