import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { buildEnquiryMailto, formatEnquiryBrief, validateEnquiry } from "../src/components/contact.ts";
import { matchesSearch } from "../src/components/filters.ts";
import { createConfiguratorSession, getConfiguratorSource, getVimeoLinks, initMedia, readConfiguratorState } from "../src/components/media.ts";

const brief = { name: "Alex Smith", phone: "+44 (0)7405 052555", email: "alex@example.co.uk", message: "Please visualise our new furniture collection." };

test("contact validation accepts UK/international numbers and keeps a multiline brief", () => {
  for (const phone of ["07405 052555", "+44 7405 052555", "+1 (212) 555-0198", "0044.7405.052555"]) {
    assert.equal(validateEnquiry({ ...brief, phone, message: "First line of the brief.\nA second line." }).valid, true, phone);
  }
  assert.equal(validateEnquiry({ ...brief, name: "  Amélie Green  " }).values.name, "Amélie Green");
});

test("contact validation rejects impossible numbers, header injection and field limits", () => {
  for (const phone of ["12345", "+1234567890123456", "please call me", "++44 7405052555", "07405\n052555"]) assert.ok(validateEnquiry({ ...brief, phone }).errors.phone);
  assert.ok(validateEnquiry({ ...brief, name: "Alex\nBcc: hidden@example.com" }).errors.name);
  assert.ok(validateEnquiry({ ...brief, email: "alex@example.com\r\nBcc: evil@example.com" }).errors.email);
  assert.ok(validateEnquiry({ ...brief, name: "a".repeat(101) }).errors.name);
  assert.ok(validateEnquiry({ ...brief, message: "a".repeat(4001) }).errors.message);
  assert.ok(validateEnquiry({ ...brief, message: "short" }).errors.message);
});

test("mailto keeps its recipient and subject fixed, URI encodes all brief data and includes phone", () => {
  const input = { ...brief, message: "A render & animation?\nBcc: another@example.com\nFinish: #amber + white" };
  const mailto = new URL(buildEnquiryMailto(input));
  assert.equal(mailto.protocol, "mailto:");
  assert.equal(mailto.pathname, "info@fireballstudios.co.uk");
  assert.deepEqual([...mailto.searchParams.keys()], ["subject", "body"]);
  assert.equal(mailto.searchParams.get("subject"), "Project enquiry — Fireball Studios");
  assert.equal(mailto.searchParams.get("body"), formatEnquiryBrief(input));
  assert.match(mailto.searchParams.get("body") ?? "", /Phone: \+44 \(0\)7405 052555/);
});

test("Vimeo embeds reject non-numeric injection while retaining a normal film fallback", () => {
  assert.deepEqual(getVimeoLinks("1243948791"), { embed: "https://player.vimeo.com/video/1243948791?autoplay=1&dnt=1", fallback: "https://vimeo.com/1243948791" });
  for (const id of ["", "javascript:alert(1)", "1243948791?autoplay=0", "https://vimeo.com/1243948791"]) assert.equal(getVimeoLinks(id), undefined);
});

test("configurator paths resolve from nested pages but cannot load third-party or alternate HTML", () => {
  const base = "https://example.com/projects/car-configurator/";
  assert.equal(getConfiguratorSource("../../experiences/car/fireball-car-configurator2.html", base), "https://example.com/experiences/car/fireball-car-configurator2.html");
  for (const source of ["https://evil.example/experiences/car/fireball-car-configurator2.html", "javascript:alert(1)", "/experiences/car/other.html", "/experiences/car/fireball-car-configurator2.html?redirect=evil"]) assert.equal(getConfiguratorSource(source, base), undefined);
});

test("configurator lifecycle ignores spoofed messages, cancels deadlines and disposes once", () => {
  const messages: unknown[] = [];
  const child = { postMessage: (message: unknown, target: string) => messages.push({ message, target }) } as unknown as Window;
  const states: string[] = [];
  let deadline: (() => void) | undefined;
  let cancelled = 0;
  const session = createConfiguratorSession({ child, report: (state) => states.push(state), schedule: (callback) => { deadline = callback; return () => { cancelled += 1; }; } });
  const valid = { source: child, origin: "null", data: { channel: "fireball-configurator", state: "ready" } };
  session.receive({ ...valid, origin: "https://example.com" });
  session.receive({ ...valid, source: {} as Window });
  session.receive({ ...valid, data: { channel: "other", state: "ready" } });
  assert.deepEqual(states, []);
  session.receive(valid);
  assert.deepEqual(states, ["ready"]);
  assert.equal(cancelled, 1);
  session.pause(true);
  session.pause(false);
  session.dispose();
  session.dispose();
  session.pause(true);
  deadline?.();
  session.receive(valid);
  assert.deepEqual(states, ["ready"]);
  assert.deepEqual(messages, [
    { message: { channel: "fireball-configurator", command: "pause", paused: true }, target: "*" },
    { message: { channel: "fireball-configurator", command: "pause", paused: false }, target: "*" },
    { message: { channel: "fireball-configurator", command: "dispose" }, target: "*" },
  ]);
  assert.equal(readConfiguratorState(valid, null), undefined);
});

test("configurator reports a loading deadline and permits recovery from a genuine late ready message", () => {
  const child = { postMessage() {} } as unknown as Window;
  const states: string[] = [];
  let deadline: (() => void) | undefined;
  const session = createConfiguratorSession({ child, report: (state) => states.push(state), schedule: (callback) => { deadline = callback; return () => {}; } });
  deadline?.();
  session.receive({ source: child, origin: "null", data: { channel: "fireball-configurator", state: "ready" } });
  assert.deepEqual(states, ["timeout", "ready"]);
  session.dispose();
});

test("article searches match all words without accents or case dependence", () => {
  assert.equal(matchesSearch("Café interiors: colour and 3D visualisation", "COLOUR café"), true);
  assert.equal(matchesSearch("Property rendering", "property automotive"), false);
  assert.equal(matchesSearch("Property rendering", "   "), true);
});

test("media stays deferred, mounts one player on demand, then unloads and disposes it on close", () => {
  const { document, Event: DOMEvent } = parseHTML(`<html><body>
    <button data-video-trigger data-video-id="1243948791" data-video-title="Residence film">Play film</button>
    <dialog data-film-dialog><button data-film-close>Close</button><div data-film-stage></div><p data-film-status></p><a data-vimeo-fallback>Vimeo</a></dialog>
    <section data-configurator data-src="../../experiences/car/fireball-car-configurator2.html"><button data-configurator-launch>Launch</button><a data-configurator-standalone>Open standalone</a></section>
    <dialog data-configurator-dialog><button data-configurator-close>Close</button><div data-configurator-stage></div><p data-configurator-status></p></dialog>
  </body></html>`);
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const events = new EventTarget();
  const commands: unknown[] = [];
  const timers = new Map<number, () => void>();
  let serial = 0;
  const child = { postMessage: (data: unknown) => commands.push(data) };
  const createElement = document.createElement.bind(document);
  document.createElement = ((tag: string) => {
    const element = createElement(tag);
    if (tag === "iframe") Object.defineProperty(element, "contentWindow", { value: child });
    return element;
  }) as typeof document.createElement;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { href: "https://example.com/projects/car-configurator/" },
    setTimeout(callback: () => void) { const id = ++serial; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); },
    addEventListener: events.addEventListener.bind(events),
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  let cleanup: (() => void) | undefined;
  try {
    cleanup = initMedia();
    assert.equal(document.querySelectorAll("iframe").length, 0);
    assert.equal(timers.size, 0);
    document.querySelector<HTMLButtonElement>("[data-video-trigger]")?.click();
    assert.equal(document.querySelectorAll("iframe").length, 1);
    assert.equal(document.querySelector("iframe")?.getAttribute("src"), "https://player.vimeo.com/video/1243948791?autoplay=1&dnt=1");
    const retiredFilm = document.querySelector("iframe");
    document.querySelector<HTMLButtonElement>("[data-configurator-launch]")?.click();
    assert.equal(document.querySelectorAll("iframe").length, 1);
    assert.equal(document.querySelector("iframe")?.getAttribute("sandbox"), "allow-scripts allow-pointer-lock");
    assert.equal(document.querySelector("[data-film-stage]")?.children.length, 0);
    retiredFilm?.dispatchEvent(new DOMEvent("load"));
    assert.equal(timers.size, 1, "a retired iframe must not cancel the active viewer deadline");
    document.querySelector<HTMLButtonElement>("[data-configurator-close]")?.click();
    assert.equal(document.querySelectorAll("iframe").length, 0);
    assert.equal(timers.size, 0);
    assert.deepEqual(commands, [{ channel: "fireball-configurator", command: "dispose" }]);
  } finally {
    cleanup?.();
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else Reflect.deleteProperty(globalThis, "document");
  }
});
