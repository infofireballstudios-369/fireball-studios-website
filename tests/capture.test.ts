import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { checkedParentOrigin, captureMessage, captureParentOrigins, initCaptureBridge } from "../src/capture/bridge.ts";
import { captchaScale, initCaptureForm } from "../src/capture/form.ts";

const html = await readFile(new URL("../capture/index.html", import.meta.url), "utf8");
const thanksHtml = await readFile(new URL("../capture/thanks/index.html", import.meta.url), "utf8");
const headers = await readFile(new URL("../capture/_headers", import.meta.url), "utf8");
const values = { name: "Alex Smith", phone: "+44 7405 052555", email: "alex@example.co.uk", message: "Please visualise our new furniture collection." };

test("capture is a separate noindex native form with all four fields, honeypot and real CAPTCHA declaration", () => {
  const document = parseHTML(html).document;
  const form = document.querySelector("form")!;
  assert.equal(form.getAttribute("name"), "fireball-project-enquiry");
  assert.equal(form.getAttribute("method"), "POST");
  assert.equal(form.getAttribute("action"), "/thanks/");
  assert.equal(form.getAttribute("data-netlify"), "true");
  assert.equal(form.getAttribute("netlify-honeypot"), "website");
  assert.equal(form.getAttribute("data-netlify-recaptcha"), "true");
  assert.equal(form.querySelector("[name='form-name']")?.getAttribute("value"), "fireball-project-enquiry");
  assert.deepEqual([...form.querySelectorAll("input:not([type=hidden]),textarea")].map((field) => field.getAttribute("name")), ["website", "name", "phone", "email", "message"]);
  for (const name of Object.keys(values)) assert.ok(form.querySelector(`label[for='${name}']`));
  assert.equal(form.querySelector("[data-netlify-recaptcha][data-size]")?.getAttribute("data-size"), "compact");
  assert.match(document.querySelector("meta[name=robots]")?.getAttribute("content") || "", /noindex/);
  assert.match(parseHTML(thanksHtml).document.querySelector("meta[name=robots]")?.getAttribute("content") || "", /noindex/);
  assert.match(thanksHtml, /does not confirm email delivery or a project booking/);
  assert.doesNotMatch(html + thanksHtml, /<script(?![^>]*src=)[^>]*>/);
  assert.doesNotMatch(html, /_captcha|formsubmit.co|formspree.io|api-key/i);
});

test("capture CSP permits only CAPTCHA dependencies and exact approved frame ancestors", () => {
  const csp = headers.split("\n").find((line) => line.includes("Content-Security-Policy:"))!;
  assert.match(csp, /script-src 'self' https:\/\/www.google.com\/recaptcha\/ https:\/\/www.gstatic.com\/recaptcha\//);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline|unsafe-eval|\*\./);
  assert.match(csp, /form-action 'self' mailto:/);
  assert.doesNotMatch(headers, /X-Frame-Options/i);
  const ancestors = csp.split("frame-ancestors ")[1].split(" ");
  assert.deepEqual(ancestors, [...captureParentOrigins]);
  assert.match(headers, /X-Robots-Tag: noindex/);
});

test("child bridge rejects unknown parents, origins, channels and payload extensions", () => {
  const parent = {} as Window;
  const event = { source: parent, origin: "https://fireballstudios.co.uk", data: { channel: "fireball-enquiry", type: "hello" } };
  for (const origin of captureParentOrigins) assert.equal(checkedParentOrigin({ ...event, origin }, parent), origin);
  for (const origin of ["http://fireballstudios.co.uk", "https://fireballstudios.co.uk.evil.example", "http://localhost:9000", "null"]) assert.equal(checkedParentOrigin({ ...event, origin }, parent), undefined);
  assert.equal(checkedParentOrigin({ ...event, source: {} as Window }, parent), undefined);
  assert.equal(checkedParentOrigin({ ...event, data: { ...event.data, email: "private@example.com" } }, parent), undefined);
  assert.equal(checkedParentOrigin({ ...event, data: { channel: "fireball-enquiry", type: "submitted" } }, parent), undefined);
  assert.equal(checkedParentOrigin({ ...event, data: null }, parent), undefined);
  assert.deepEqual(captureMessage("resize", 612.3), { channel: "fireball-enquiry", type: "resize", height: 613 });
  assert.equal(captureMessage("ready", 9000).height, 1800);
  assert.equal(captureMessage("submitted", Number.NaN).height, 320);
});

test("bridge measures content, coalesces resize work, responds after every handshake and cleans up", () => {
  const { document } = parseHTML('<div data-capture-content></div><main data-capture-thanks></main>');
  const content = document.querySelector("[data-capture-content]")!;
  let naturalHeight = 610;
  Object.defineProperty(content, "scrollHeight", { get: () => naturalHeight });
  content.getBoundingClientRect = (() => ({ height: naturalHeight })) as typeof content.getBoundingClientRect;
  const messages: { data: unknown; origin: string }[] = [];
  const parent = { postMessage: (data: unknown, origin: string) => messages.push({ data, origin }) };
  const events = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>(); let serial = 0;
  let resized: (() => void) | undefined; let disconnected = 0;
  const old = new Map(["document", "window", "ResizeObserver"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { parent, location: { search: "?embedded=1" }, addEventListener: events.addEventListener.bind(events), requestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++serial; frames.set(id, callback); return id; }, cancelAnimationFrame: (id: number) => frames.delete(id) } });
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class { constructor(callback: () => void) { resized = callback; } observe(node: Element) { assert.equal(node, content); } disconnect() { disconnected++; } } });
  const hello = (origin = "https://fireballstudios.co.uk") => { const event = new Event("message"); Object.defineProperties(event, { source: { value: parent }, origin: { value: origin }, data: { value: { channel: "fireball-enquiry", type: "hello" } } }); events.dispatchEvent(event); };
  let cleanup: (() => void) | undefined;
  try {
    cleanup = initCaptureBridge();
    assert.equal(messages.length, 0, "no wildcard broadcast before checked handshake");
    hello("https://evil.example"); assert.equal(messages.length, 0);
    hello(); assert.deepEqual(messages.map((entry) => entry.data), [captureMessage("ready", 610), captureMessage("submitted", 610)]);
    naturalHeight = 712; resized?.(); resized?.(); assert.equal(frames.size, 1);
    for (const [id, callback] of frames) { frames.delete(id); callback(0); }
    assert.deepEqual(messages.at(-1)?.data, captureMessage("resize", 712));
    hello(); assert.equal(messages.length, 5, "a newly navigated document can acknowledge another parent handshake");
    resized?.(); cleanup(); assert.equal(frames.size, 0); assert.equal(disconnected, 1);
    hello(); assert.equal(messages.length, 5);
    assert.ok(messages.every((entry) => entry.origin === "https://fireballstudios.co.uk"));
  } finally { cleanup?.(); for (const [name, descriptor] of old) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
});

test("capture preserves invalid details and blocks submission until the security token is present", () => {
  const { document, Event: DOMEvent } = parseHTML(html);
  const form = document.querySelector<HTMLFormElement>("form")!;
  const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
  for (const field of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name],textarea[name]")) controls.set(field.name, field);
  Object.defineProperty(form, "elements", { value: { namedItem: (name: string) => controls.get(name) || null } });
  for (const [name, value] of Object.entries(values)) controls.get(name)!.value = value;
  controls.get("message")!.value = "test";
  controls.get("message")!.focus = () => {};
  form.querySelector<HTMLElement>("[data-captcha-region]")!.focus = () => {};
  const old = new Map(["document", "window", "HTMLFormElement"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  let submissions = 0;
  const events = new EventTarget();
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: events.addEventListener.bind(events), requestAnimationFrame: () => 1, cancelAnimationFrame() {} } });
  Object.defineProperty(globalThis, "HTMLFormElement", { configurable: true, value: { prototype: { submit() { submissions++; } } } });
  let cleanup: (() => void) | undefined;
  try {
    cleanup = initCaptureForm();
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    assert.equal(submissions, 0); assert.equal(controls.get("message")!.value, "test");
    assert.match(form.querySelector("[data-error-for=message]")!.textContent!, /10–4,000/);
    controls.get("message")!.value = values.message;
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    assert.equal(submissions, 0); assert.match(form.querySelector("[data-form-status]")!.textContent!, /Complete the security check/);
    assert.match(form.querySelector("[data-email-draft]")!.getAttribute("href")!, /^mailto:info@fireballstudios.co.uk/);
    assert.equal(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, false);
  } finally { cleanup?.(); for (const [name, descriptor] of old) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
});

test("CAPTCHA fallback scales only a too-wide widget, never the document", () => {
  assert.equal(captchaScale(250, 304), 250 / 304);
  assert.equal(captchaScale(250, 164), 1);
  assert.equal(captchaScale(0, 304), 1);
  assert.equal(captchaScale(300, 0), 1);
});

test("same-origin transport URL-encodes all managed form fields without private credentials", async () => {
  const { submitCapture } = await import("../src/capture/transport.ts");
  const data = new FormData();
  for (const [name, value] of Object.entries({ ...values, "form-name": "fireball-project-enquiry", website: "", "g-recaptcha-response": "unit-test-token-presence-only" })) data.set(name, value);
  let calls = 0;
  await submitCapture("/thanks/", data, { currentUrl: "https://fireball-studios-enquiries.netlify.app/", fetcher: (async (url, options) => {
    calls++;
    assert.equal(url, "https://fireball-studios-enquiries.netlify.app/thanks/");
    assert.equal(options?.method, "POST"); assert.equal(options?.credentials, "omit");
    assert.equal(new Headers(options?.headers).get("Content-Type"), "application/x-www-form-urlencoded");
    const payload = new URLSearchParams(options?.body as string);
    assert.equal(payload.get("form-name"), "fireball-project-enquiry");
    assert.equal(payload.get("phone"), values.phone);
    assert.equal(payload.get("g-recaptcha-response"), "unit-test-token-presence-only");
    assert.equal(payload.get("website"), "");
    return new Response("Service acknowledgement", { status: 200 });
  }) as typeof fetch });
  assert.equal(calls, 1);
});

test("capture transport rejects error responses, foreign targets and stalled acknowledgements", async () => {
  const { submitCapture, CaptureSendError } = await import("../src/capture/transport.ts");
  const data = new FormData(); data.set("form-name", "fireball-project-enquiry");
  const currentUrl = "https://fireball-studios-enquiries.netlify.app/";
  for (const [status, reason] of [[422, "rejected"], [429, "limit"], [503, "rejected"]] as const) {
    await assert.rejects(submitCapture("/thanks/", data, { currentUrl, fetcher: (async () => new Response("Unavailable", { status })) as typeof fetch }), (error: unknown) => error instanceof CaptureSendError && error.reason === reason);
  }
  await assert.rejects(submitCapture("/thanks/", data, { currentUrl, fetcher: (async () => { throw new Error("offline"); }) as typeof fetch }), CaptureSendError);
  await assert.rejects(submitCapture("/thanks/", data, { currentUrl, timeoutMs: 5, fetcher: (() => new Promise(() => {})) as typeof fetch }), (error: unknown) => error instanceof CaptureSendError && error.reason === "timeout");
  let requests = 0;
  await assert.rejects(submitCapture("https://evil.example/", data, { currentUrl, fetcher: (async () => { requests++; return new Response(); }) as typeof fetch }), CaptureSendError);
  assert.equal(requests, 0);
});
