import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { getNetlifyFormUrl, netlifyEnquiryOrigin } from "../src/lib/form-endpoint.ts";
import { readBuildConfig } from "../src/lib/build-config.ts";
import { getPageCsp } from "../src/lib/security.ts";
import { buildPages } from "../src/templates/pages.ts";
import { initEnquiryFrame, readEnquiryFrameMessage } from "../src/components/enquiry-frame.ts";

const url = netlifyEnquiryOrigin + "/";
const config = () => readBuildConfig({ FORM_PROVIDER: "netlify", NETLIFY_FORM_URL: url }, false);

test("Netlify capture requires explicit selection and one approved public HTTPS root", () => {
  assert.equal(getNetlifyFormUrl(undefined), undefined);
  assert.equal(getNetlifyFormUrl(" " + netlifyEnquiryOrigin + " "), url);
  assert.equal(readBuildConfig({ NETLIFY_FORM_URL: url }, false).formProvider, "formsubmit");
  assert.equal(config().netlifyFormUrl, url);
  assert.equal(config().formProvider, "netlify");
  assert.throws(() => readBuildConfig({ FORM_PROVIDER: "netlify" }, false));
  for (const target of ["http://fireball-studios-enquiries.netlify.app/", "https://evil.netlify.app/", url + "thanks/", url + "?x=1", url + "#section", "https://user:secret@fireball-studios-enquiries.netlify.app/", "https://fireball-studios-enquiries.netlify.app:443/", "https://fireball-studios-enquiries.netlify.app.evil.example/"]) assert.throws(() => getNetlifyFormUrl(target), target);
});

test("hosted Contact keeps semantic copy and fallback links without initial fields or iframe", () => {
  const pages = buildPages(config());
  const page = pages.find((entry) => entry.route === "contact/")!;
  const { document } = parseHTML(page.body);
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelectorAll("iframe, input, textarea, select, form").length, 0);
  const panel = document.querySelector("[data-enquiry-frame]")!;
  assert.equal(panel.getAttribute("data-enquiry-url"), url);
  assert.equal(panel.querySelector("[data-enquiry-standalone]")?.getAttribute("href"), url);
  assert.ok(panel.querySelector('a[href="mailto:info@fireballstudios.co.uk"]'));
  assert.match(panel.textContent!, /name, phone number, email address/);
  assert.match(pages.find((entry) => entry.route === "privacy/")!.body, /Netlify for storage, spam filtering/);
});

test("capture CSP grants only Contact's exact frame origin with no new scripts or AJAX permissions", () => {
  const policy = getPageCsp(config(), "contact/");
  const directive = new Map(policy.split("; ").map((part) => [part.split(" ")[0], part]));
  assert.equal(directive.get("frame-src"), "frame-src 'self' https://player.vimeo.com " + netlifyEnquiryOrigin);
  assert.equal(directive.get("connect-src"), "connect-src 'self'");
  assert.equal(directive.get("script-src"), "script-src 'self'");
  assert.equal(directive.get("form-action"), "form-action 'self' mailto:");
  for (const route of ["", "privacy/", "projects/", "blog/"]) assert.doesNotMatch(getPageCsp(config(), route), /netlify\.app/);
});

test("bridge rejects spoofing, private payloads and unknown types while bounding trusted heights", () => {
  const child = {} as Window;
  const valid = { source: child, origin: netlifyEnquiryOrigin, data: { channel: "fireball-enquiry", type: "ready", height: 812.2 } };
  assert.deepEqual(readEnquiryFrameMessage(valid, child, netlifyEnquiryOrigin), { type: "ready", height: 813 });
  assert.deepEqual(readEnquiryFrameMessage({ ...valid, data: { ...valid.data, height: -10 } }, child, netlifyEnquiryOrigin), { type: "ready", height: 250 });
  assert.deepEqual(readEnquiryFrameMessage({ ...valid, data: { ...valid.data, height: 9000 } }, child, netlifyEnquiryOrigin), { type: "ready", height: 2000 });
  for (const event of [
    { ...valid, origin: "https://evil.example" }, { ...valid, source: {} as Window },
    ...[null, [], { ...valid.data, channel: "other" }, { ...valid.data, type: "email" }, { ...valid.data, height: NaN }, { ...valid.data, height: "812" }, { ...valid.data, email: "private@example.com" }].map((data) => ({ ...valid, data })),
  ]) assert.equal(readEnquiryFrameMessage(event, child, netlifyEnquiryOrigin), undefined);
  assert.equal(readEnquiryFrameMessage(valid, null, netlifyEnquiryOrigin), undefined);
});

function environment() {
  const { document, Event: DOMEvent } = parseHTML(`<section data-enquiry-frame data-enquiry-url="${url}"><p data-enquiry-status></p><div data-enquiry-mount></div></section>`);
  const originals = ["document", "window", "IntersectionObserver", "setTimeout", "clearTimeout"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  const timers = new Map<number, () => void>();
  const posts: { data: unknown; origin: string }[] = [];
  let timerId = 0;
  let visible!: () => void;
  let disconnects = 0;
  let child: Window;
  const create = document.createElement.bind(document);
  document.createElement = ((name: string) => {
    const element = create(name);
    if (name === "iframe") {
      child = { postMessage(data: unknown, origin: string) { posts.push({ data, origin }); } } as Window;
      Object.defineProperty(element, "contentWindow", { value: child });
    }
    return element;
  }) as typeof document.createElement;
  class Observer {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { visible = () => callback([{ isIntersecting: true }]); }
    observe() {}
    disconnect() { disconnects++; }
  }
  const window = { addEventListener(type: string, callback: (event: MessageEvent) => void, options?: { signal?: AbortSignal }) {
    const entries = listeners.get(type) || new Set(); entries.add(callback); listeners.set(type, entries);
    options?.signal?.addEventListener("abort", () => entries.delete(callback), { once: true });
  } };
  for (const [name, value] of Object.entries({ document, window, IntersectionObserver: Observer, setTimeout(callback: () => void) { const id = ++timerId; timers.set(id, callback); return id; }, clearTimeout(id: number) { timers.delete(id); } })) Object.defineProperty(globalThis, name, { configurable: true, value });
  return { document, DOMEvent, posts, timers, listeners,
    get child() { return child; }, get disconnects() { return disconnects; }, visible: () => visible(),
    message(data: unknown, source = child, origin = netlifyEnquiryOrigin) { for (const callback of listeners.get("message") ?? []) callback({ data, source, origin } as MessageEvent); },
    restore() { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } },
  };
}

test("capture mounts once near the viewport and handshakes on every navigation without exposing details", () => {
  const env = environment(); let cleanup: (() => void) | undefined;
  try {
    cleanup = initEnquiryFrame();
    assert.equal(env.document.querySelectorAll("iframe").length, 0);
    env.visible(); env.visible();
    assert.equal(env.document.querySelectorAll("iframe").length, 1);
    const frame = env.document.querySelector<HTMLIFrameElement>("iframe")!;
    assert.equal(frame.getAttribute("src"), url + "?embedded=1");
    assert.equal(frame.getAttribute("sandbox"), "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    assert.equal(frame.getAttribute("loading"), "lazy");
    assert.equal(frame.title, "Send a project enquiry to Fireball Studios");
    frame.dispatchEvent(new env.DOMEvent("load"));
    assert.deepEqual(env.posts, [{ data: { channel: "fireball-enquiry", type: "hello" }, origin: netlifyEnquiryOrigin }]);
    env.message({ channel: "fireball-enquiry", type: "ready", height: 820 });
    assert.equal(env.document.querySelector("section")?.getAttribute("data-state"), "ready");
    assert.equal(frame.style.height, "820px");
    assert.equal(env.timers.size, 0);
    env.message({ channel: "fireball-enquiry", type: "resize", height: 600 });
    assert.equal(frame.style.height, "600px");
    env.message({ channel: "fireball-enquiry", type: "resize", height: 1200, email: "private@example.com" });
    assert.equal(frame.style.height, "600px");
    frame.dispatchEvent(new env.DOMEvent("load"));
    assert.equal(env.posts.length, 2, "thanks navigation receives a new hello");
    env.message({ channel: "fireball-enquiry", type: "submitted", height: 370 });
    assert.equal(env.document.querySelector("section")?.getAttribute("data-state"), "submitted");
    assert.match(env.document.querySelector("[data-enquiry-status]")!.textContent!, /accepted.*not arrival/);
  } finally { cleanup?.(); env.restore(); }
});

test("loading failures keep alternatives usable, late ready recovers and disposal rejects stale events", () => {
  const env = environment(); let cleanup: (() => void) | undefined;
  try {
    cleanup = initEnquiryFrame(); env.visible();
    const frame = env.document.querySelector<HTMLIFrameElement>("iframe")!;
    const child = env.child;
    const deadline = [...env.timers.values()][0]; deadline();
    assert.equal(env.document.querySelector("section")?.getAttribute("data-state"), "error");
    assert.match(env.document.querySelector("[data-enquiry-status]")!.textContent!, /Open the form separately or email/);
    env.message({ channel: "fireball-enquiry", type: "ready", height: 810 });
    assert.equal(env.document.querySelector("section")?.getAttribute("data-state"), "ready");
    cleanup();
    assert.equal(env.document.querySelectorAll("iframe").length, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.listeners.get("message")?.size, 0);
    frame.dispatchEvent(new env.DOMEvent("load"));
    assert.equal(env.posts.length, 0);
    cleanup = initEnquiryFrame(); env.visible();
    assert.equal(env.document.querySelectorAll("iframe").length, 1);
    env.message({ channel: "fireball-enquiry", type: "submitted", height: 300 }, child);
    assert.notEqual(env.document.querySelector("section")?.getAttribute("data-state"), "submitted", "retired frame cannot acknowledge a new enquiry");
    assert.ok(env.disconnects >= 2);
  } finally { cleanup?.(); env.restore(); }
});
