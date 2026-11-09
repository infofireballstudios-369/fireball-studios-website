export const captureParentOrigins = [
  "https://fireballstudios.co.uk", "https://www.fireballstudios.co.uk",
  "http://localhost:5175", "http://localhost:5176", "http://127.0.0.1:5175", "http://127.0.0.1:5176",
] as const;

export type CaptureMessageType = "ready" | "resize" | "submitted";

/** Only a checked parent may subscribe; no visitor fields enter this channel. */
export function checkedParentOrigin(event: Pick<MessageEvent, "data" | "source" | "origin">, parent: Window | null): string | undefined {
  if (!parent || event.source !== parent || !captureParentOrigins.includes(event.origin as typeof captureParentOrigins[number])) return;
  const value: unknown = event.data;
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 2 || data.channel !== "fireball-enquiry" || data.type !== "hello") return;
  return event.origin;
}

export function captureMessage(type: CaptureMessageType, measuredHeight: number) {
  const height = Number.isFinite(measuredHeight) ? Math.min(1800, Math.max(320, Math.ceil(measuredHeight))) : 320;
  return { channel: "fireball-enquiry", type, height } as const;
}

/** Observe content rather than viewport height, preventing iframe resize feedback. */
export function initCaptureBridge(): () => void {
  const content = document.querySelector<HTMLElement>("[data-capture-content]");
  const embedded = window.parent !== window;
  document.documentElement.classList.toggle("is-embedded", embedded || new URLSearchParams(window.location.search).get("embedded") === "1");
  if (!content || !embedded) return () => {};
  const controller = new AbortController();
  let origin: string | undefined;
  let pending: number | undefined;
  let stopped = false;
  let previous = 0;
  let submitted = Boolean(document.querySelector("[data-capture-thanks]"));
  const height = () => Math.max(content.scrollHeight, content.getBoundingClientRect().height);
  const report = (type: CaptureMessageType) => {
    if (!origin || stopped) return;
    const message = captureMessage(type, height());
    if (type === "resize" && message.height === previous) return;
    previous = message.height;
    window.parent.postMessage(message, origin);
  };
  const schedule = () => {
    if (!stopped && pending === undefined) pending = window.requestAnimationFrame(() => { pending = undefined; report("resize"); });
  };
  window.addEventListener("message", (event) => {
    const checked = checkedParentOrigin(event, window.parent);
    if (!checked) return;
    origin = checked;
    report("ready");
    if (submitted) report("submitted");
  }, { signal: controller.signal });
  window.addEventListener("fireball:capture-submitted", () => { submitted = true; report("submitted"); }, { signal: controller.signal });
  window.addEventListener("resize", schedule, { passive: true, signal: controller.signal });
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : undefined;
  observer?.observe(content);
  void document.fonts?.ready.then(schedule);
  return () => {
    stopped = true;
    controller.abort();
    observer?.disconnect();
    if (pending !== undefined) window.cancelAnimationFrame(pending);
  };
}
