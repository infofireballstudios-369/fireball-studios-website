import { getNetlifyFormUrl } from "../lib/form-endpoint";

const channel = "fireball-enquiry";
export interface EnquiryFrameMessage { type: "ready" | "resize" | "submitted"; height: number }

/** Accept layout and acknowledgement only; enquiry details never cross this bridge. */
export function readEnquiryFrameMessage(event: Pick<MessageEvent, "origin" | "source" | "data">, child: Window | null, origin: string): EnquiryFrameMessage | undefined {
  if (!child || event.source !== child || event.origin !== origin) return;
  const data: unknown = event.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return;
  const value = data as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["channel", "type", "height"].includes(key))) return;
  if (value.channel !== channel || typeof value.type !== "string" || !["ready", "resize", "submitted"].includes(value.type) || typeof value.height !== "number" || !Number.isFinite(value.height)) return;
  return { type: value.type as EnquiryFrameMessage["type"], height: Math.max(250, Math.min(2000, Math.ceil(value.height))) };
}

let removeEnquiryFrame: (() => void) | undefined;

/** Embed one isolated capture form when its panel approaches the viewport. */
export function initEnquiryFrame(): () => void {
  removeEnquiryFrame?.();
  const panel = document.querySelector<HTMLElement>("[data-enquiry-frame]");
  const mount = panel?.querySelector<HTMLElement>("[data-enquiry-mount]");
  if (!panel || !mount) return () => {};
  const status = panel.querySelector<HTMLElement>("[data-enquiry-status]");
  const announce = (message: string) => { if (status) status.textContent = message; };
  let source: string | undefined;
  try { source = getNetlifyFormUrl(panel.dataset.enquiryUrl); } catch { /* Keep standalone email available. */ }
  if (!source) {
    panel.dataset.state = "error";
    announce("The online form is unavailable. Please email info@fireballstudios.co.uk using the link below.");
    return () => {};
  }
  const url = new URL(source);
  const origin = url.origin;
  url.searchParams.set("embedded", "1");
  const controller = new AbortController();
  let frame: HTMLIFrameElement | undefined;
  let observer: IntersectionObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const clearDeadline = () => { if (timer !== undefined) { clearTimeout(timer); timer = undefined; } };
  const failed = () => {
    if (stopped) return;
    clearDeadline();
    panel.dataset.state = "error";
    panel.removeAttribute("aria-busy");
    announce("The online form has not connected. Open the form separately or email info@fireballstudios.co.uk below. Your enquiry has not been confirmed.");
  };
  const deadline = () => { clearDeadline(); timer = setTimeout(failed, 20000); };
  const hello = () => {
    if (stopped || !frame) return;
    panel.dataset.state = "loading";
    panel.setAttribute("aria-busy", "true");
    announce("Connecting the secure enquiry form…");
    deadline();
    frame.contentWindow?.postMessage({ channel, type: "hello" }, origin);
  };
  window.addEventListener("message", (event: MessageEvent) => {
    if (stopped || !frame) return;
    const message = readEnquiryFrameMessage(event, frame.contentWindow, origin);
    if (!message) return;
    frame.style.height = `${message.height}px`;
    if (message.type === "resize") return;
    clearDeadline();
    panel.removeAttribute("aria-busy");
    if (message.type === "submitted") {
      panel.dataset.state = "submitted";
      announce("Our form service has accepted your enquiry. This confirms submission, not arrival in the studio’s inbox. You can email us directly with any follow-up.");
    } else {
      panel.dataset.state = "ready";
      announce("The enquiry form is ready. Your details are entered directly into our form service.");
    }
  }, { signal: controller.signal });
  const start = () => {
    if (stopped || frame) return;
    observer?.disconnect();
    panel.dataset.state = "loading";
    panel.setAttribute("aria-busy", "true");
    announce("Loading the secure enquiry form…");
    frame = document.createElement("iframe");
    frame.title = "Send a project enquiry to Fireball Studios";
    frame.className = "enquiry-frame";
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.setAttribute("loading", "lazy");
    frame.setAttribute("width", "100%");
    frame.setAttribute("height", "840");
    frame.addEventListener("load", hello, { signal: controller.signal });
    frame.addEventListener("error", failed, { signal: controller.signal });
    frame.src = url.href;
    mount.replaceChildren(frame);
    deadline();
  };
  panel.dataset.state = "waiting";
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) start(); }, { rootMargin: "200px 0px" });
    observer.observe(panel);
  } else start();
  removeEnquiryFrame = () => {
    if (stopped) return;
    stopped = true;
    clearDeadline();
    observer?.disconnect();
    controller.abort();
    if (frame) { frame.src = "about:blank"; frame.remove(); frame = undefined; }
    panel.removeAttribute("aria-busy");
    panel.dataset.state = "waiting";
  };
  return removeEnquiryFrame;
}
