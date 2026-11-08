"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, RotateCcw, SlidersHorizontal, X } from "lucide-react";

interface ConfiguratorPlayerProps {
  src?: string;
  title?: string;
  poster?: string;
  posterAlt?: string;
}

type PlayerStatus = "idle" | "loading" | "ready" | "error";

/** Fetch the model only on request and keep its scripts in an opaque iframe. */
export function ConfiguratorPlayer({
  src = "/experiences/car/fireball-car-configurator2.html",
  title = "Fireball Studios car configurator",
  poster = "/posters/car-configurator.webp",
  posterAlt = "A three-quarter view of the Mazda MX-5 model used in the car configurator",
}: ConfiguratorPlayerProps) {
  const [active, setActive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);
  const frameId = useId();

  useEffect(() => {
    if (!active) return;
    const iframe = iframeRef.current;
    const player = playerRef.current;
    if (!iframe || !player) return;
    const child = iframe.contentWindow;
    let visible = true;
    let settled = false;
    const send = (command: "pause" | "dispose", paused?: boolean) => {
      // An opaque sandbox requires a wildcard target; no visitor data is sent.
      child?.postMessage({ channel: "fireball-configurator", command, ...(command === "pause" ? { paused } : {}) }, "*");
    };
    const syncVisibility = () => send("pause", document.hidden || !visible);
    const timeout = window.setTimeout(() => {
      if (!settled) setStatus("error");
    }, 45000);
    const receive = (event: MessageEvent) => {
      // The sandbox deliberately omits allow-same-origin, so its origin is null.
      if (event.source !== child || event.origin !== "null") return;
      const data: unknown = event.data;
      if (!data || typeof data !== "object" || !("channel" in data) || data.channel !== "fireball-configurator" || !("state" in data)) return;
      if (data.state === "ready") {
        settled = true;
        window.clearTimeout(timeout);
        setStatus("ready");
        syncVisibility();
      } else if (data.state === "error") {
        settled = true;
        window.clearTimeout(timeout);
        setStatus("error");
      }
    };
    window.addEventListener("message", receive);
    document.addEventListener("visibilitychange", syncVisibility);
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      syncVisibility();
    });
    observer.observe(player);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      document.removeEventListener("visibilitychange", syncVisibility);
      observer.disconnect();
      send("dispose");
    };
  }, [active, attempt]);

  const close = () => {
    iframeRef.current?.contentWindow?.postMessage({ channel: "fireball-configurator", command: "dispose" }, "*");
    setActive(false);
    setStatus("idle");
    requestAnimationFrame(() => launchRef.current?.focus());
  };

  return (
    <div ref={playerRef} className="configurator-player">
      {!active ? (
        <div className="configurator-poster">
          <Image src={poster} alt={posterAlt} fill sizes="(max-width:800px) 90vw, 90vw" />
          <div className="configurator-launch">
            <p className="eyebrow"><span /> Explore the possibilities</p>
            <h2>Your finish.<br />Your perspective.</h2>
            <p>Change the paint, wheels and details in a live 3D studio.</p>
            <button ref={launchRef} className="button button-amber" type="button" aria-controls={frameId} aria-expanded={false} onClick={() => { setStatus("loading"); setActive(true); }}><SlidersHorizontal size={17} />Launch configurator</button>
            <span className="small-label">Loads the interactive 3D model when opened.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="configurator-toolbar">
            <span>{title}</span>
            <button className="button button-outline" type="button" onClick={close}><X size={16} />Close configurator</button>
          </div>
          {status === "loading" && <p className="configurator-status" role="status">Preparing the interactive studio. The first load may take a moment…</p>}
          {status === "error" && <div className="configurator-status configurator-error" role="alert"><p>The interactive studio could not finish loading. Check your connection and WebGL support, then try again.</p><button className="text-link" type="button" onClick={() => { setStatus("loading"); setAttempt((previous) => previous + 1); }}><RotateCcw size={15} />Try again</button></div>}
          <iframe key={attempt} ref={iframeRef} id={frameId} className="configurator-frame" src={src} title={title} sandbox="allow-scripts allow-downloads allow-popups" allow="fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setStatus("error")} />
        </>
      )}
      <p className="configurator-fallback"><a className="text-link" href={src} target="_blank" rel="noopener noreferrer">Open the standalone configurator <ArrowUpRight size={15} /></a></p>
    </div>
  );
}
