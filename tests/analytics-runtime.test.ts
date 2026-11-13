import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { initAnalyticsConsent, createBrowserAnalyticsPort } from "../src/components/analytics-consent.ts";
import { ANALYTICS_PREFERENCE_KEY, serialiseConsent } from "../src/lib/analytics.ts";

const id = "G-7RV5GM0GCF", origin = "https://fireballstudios.co.uk";
const routes = { "/": "Studio", "/projects": "Selected Projects", "/contact": "Start a Project" };
const config = { measurementId: id, origin, routes };
function environment({ preference = null as string | null, browserOrigin = origin, path = "/projects/", cookie = "" } = {}) {
  const { document, Event: DOMEvent } = parseHTML(`<html><head><script type="application/json" id="fireball-analytics-config">${JSON.stringify(config)}</script></head><body><main><input name="email" value="private@example.com"></main><button data-analytics-settings hidden aria-expanded="false">Settings</button><section data-analytics-consent hidden tabindex="-1"><button data-analytics-choice="accept">Accept</button><button data-analytics-choice="reject">Reject</button><button data-analytics-withdraw hidden>Withdraw</button><button data-analytics-close hidden>Close</button><p data-analytics-status></p></section></body></html>`);
  const originals = ["window", "document"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const events = new EventTarget(), timers = new Map<number, { callback: () => void; delay: number }>();
  let timer = 0, stored = preference, blocked = false, active: Element | null = null, focuses = 0;
  const cookieJar = new Map(cookie.split(";").map((part) => part.trim().split("=")).filter((pair) => pair[0]).map(([name, value]) => [name, value]));
  const cookieWrites: string[] = [];
  Object.defineProperty(document, "cookie", { configurable: true, get: () => [...cookieJar].map(([name, value]) => name + "=" + value).join("; "), set: (value: string) => { cookieWrites.push(value); const [name, item] = value.split(";", 1)[0].split("="); if (/Max-Age=0/.test(value)) cookieJar.delete(name); else cookieJar.set(name, item); } });
  Object.defineProperty(document, "activeElement", { configurable: true, get: () => active });
  Object.defineProperty(document, "referrer", { configurable: true, value: "https://www.google.co.uk/search?q=private@example.com" });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(document, "title", { configurable: true, get() { throw new Error("Raw document title must not be read"); } });
  for (const element of document.querySelectorAll<HTMLElement>("button, section")) element.focus = () => { active = element; focuses++; };
  const target: Record<string, unknown> = {
    location: { origin: browserOrigin, hostname: new URL(browserOrigin).hostname, pathname: path, search: "?email=private@example.com", hash: "#private" },
    localStorage: { getItem(key: string) { assert.equal(key, ANALYTICS_PREFERENCE_KEY); if (blocked) throw new Error("Storage unavailable"); return stored; }, setItem(key: string, value: string) { assert.equal(key, ANALYTICS_PREFERENCE_KEY); if (blocked) throw new Error("Storage unavailable"); stored = value; } },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    setTimeout(callback: () => void, delay: number) { const key = ++timer; timers.set(key, { callback, delay }); return key; },
    clearTimeout(key: number) { timers.delete(key); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  const commands = () => ((target.dataLayer as Array<ArrayLike<unknown>>) ?? []).map((item) => Array.from(item));
  return { document, DOMEvent, timers, target, commands, cookieWrites,
    views: () => commands().filter((entry) => entry[0] === "event"), get focuses() { return focuses; },
    blockStorage() { blocked = true; },
    storage(value: string | null) { stored = value; const event = new Event("storage"); Object.defineProperty(event, "key", { value: ANALYTICS_PREFERENCE_KEY }); events.dispatchEvent(event); },
    click(selector: string) { const button = document.querySelector<HTMLButtonElement>(selector)!; button.focus(); button.click(); },
    async loaded() { const script = document.getElementById("fireball-google-analytics") as HTMLScriptElement; assert.ok(script); script.onload?.call(script, new Event("load")); await Promise.resolve(); await Promise.resolve(); },
    restore() { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } },
  };
}

test("runtime does not create Google globals, scripts or cookies before acceptance and never steals initial focus", () => {
  const env = environment(); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent();
    assert.equal(env.document.querySelectorAll('script[src*="googletagmanager"]').length, 0);
    assert.equal(env.target.dataLayer, undefined); assert.equal(env.target.gtag, undefined); assert.deepEqual(env.cookieWrites, []);
    assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-consent]")!.hidden, false);
    assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-settings]")!.hidden, false);
    assert.equal(env.focuses, 0);
    env.click('[data-analytics-choice="reject"]');
    assert.equal(env.target.dataLayer, undefined);
    assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-consent]")!.hidden, true);
  } finally { dispose?.(); env.restore(); }
});

test("acceptance creates one deferred tag and one sanitised page view using arguments-shaped queue entries", async () => {
  const env = environment(); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent(); env.click('[data-analytics-choice="accept"]');
    const script = env.document.getElementById("fireball-google-analytics") as HTMLScriptElement;
    assert.ok(script); assert.equal(script.src, "https://www.googletagmanager.com/gtag/js?id=" + id);
    assert.equal(script.referrerPolicy, "no-referrer"); assert.equal(env.views().length, 0);
    assert.ok((env.target.dataLayer as unknown[]).every((entry) => !Array.isArray(entry)), "gtag uses arguments objects");
    await env.loaded();
    assert.equal(env.views().length, 1);
    assert.deepEqual(env.views()[0][2], { page_location: origin + "/projects/", page_title: "Selected Projects", page_referrer: "https://www.google.co.uk/", send_to: id });
    assert.doesNotMatch(JSON.stringify(env.commands()), /private@example|#private|\?email=/);
    env.click("[data-analytics-settings]");
    assert.equal(env.document.activeElement, env.document.querySelector("[data-analytics-consent]"));
    env.click("[data-analytics-withdraw]");
    assert.equal(env.target["ga-disable-" + id], true);
    assert.equal(env.document.querySelectorAll('script[src*="googletagmanager"]').length, 1, "executed tag is disabled, not loaded again");
    assert.equal(env.document.activeElement, env.document.querySelector("[data-analytics-settings]"));
  } finally { dispose?.(); env.restore(); }
});

test("normal teardown and reinitialisation preserve accepted cookies; explicit BFCache return counts once", async () => {
  const env = environment({ preference: serialiseConsent("accepted", Date.now()), cookie: "_ga=client; _ga_7RV5GM0GCF=session; essential=keep" }); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent(); await env.loaded(); assert.equal(env.views().length, 1);
    const defaults = env.commands().filter((entry) => entry[0] === "consent" && entry[1] === "default").length;
    dispose(); assert.equal(env.cookieWrites.length, 0);
    dispose = initAnalyticsConsent();
    assert.equal(env.views().length, 1); assert.equal(env.cookieWrites.length, 0);
    assert.equal(env.commands().filter((entry) => entry[0] === "consent" && entry[1] === "default").length, defaults);
    dispose(); dispose = initAnalyticsConsent({ restored: true });
    assert.equal(env.views().length, 2); assert.equal(env.cookieWrites.length, 0);
    assert.equal((env.views()[1][2] as Record<string, unknown>).page_referrer, "", "BFCache does not replay a stale acquisition referrer");
    assert.equal(env.document.querySelectorAll('script[src*="googletagmanager"]').length, 1);
    env.storage(serialiseConsent("rejected", Date.now()));
    assert.ok(env.cookieWrites.some((cookie) => cookie.startsWith("_ga=")));
    assert.equal(env.document.cookie, "essential=keep");
  } finally { dispose?.(); env.restore(); }
});

test("script loader deduplicates pending requests, times out after 12 seconds and aborts safely", async () => {
  const env = environment();
  try {
    const port = createBrowserAnalyticsPort(id, origin);
    const controller = new AbortController();
    const first = port.loadScript(controller.signal), second = port.loadScript(controller.signal);
    assert.equal(first, second); assert.equal(env.document.querySelectorAll('script[src*="googletagmanager"]').length, 1);
    const failed = assert.rejects(first, /Analytics unavailable/);
    const timeout = [...env.timers.values()].find((timer) => timer.delay === 12000)!; assert.ok(timeout); timeout.callback(); await failed;
    assert.equal(env.document.getElementById("fireball-google-analytics"), null);
    const cancelled = new AbortController(); const pending = port.loadScript(cancelled.signal); const rejected = assert.rejects(pending, /Analytics unavailable/); cancelled.abort(); await rejected;
    assert.equal(env.document.getElementById("fireball-google-analytics"), null); assert.equal(env.timers.size, 0);
  } finally { env.restore(); }
});

test("revoking before a pending tag loads removes it and keeps every page event blocked", async () => {
  const env = environment(); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent(); env.click('[data-analytics-choice="accept"]');
    env.click("[data-analytics-settings]"); env.click("[data-analytics-withdraw]");
    assert.equal(env.document.getElementById("fireball-google-analytics"), null);
    await Promise.resolve(); await Promise.resolve();
    assert.equal(env.views().length, 0); assert.equal(env.target["ga-disable-" + id], true);
    assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-consent]")!.hidden, true);
  } finally { dispose?.(); env.restore(); }
});

test("missing/invalid config, private paths and non-brand origins cannot activate analytics", () => {
  for (const options of [{ browserOrigin: "https://preview.netlify.app" }, { path: "/private/person@example.com" }, { path: "/projects/", invalidConfig: true }]) {
    const env = environment(options); let dispose: (() => void) | undefined;
    try {
      if (options.invalidConfig) env.document.getElementById("fireball-analytics-config")!.textContent = "{}";
      dispose = initAnalyticsConsent();
      assert.equal(env.target.dataLayer, undefined); assert.equal(env.document.getElementById("fireball-google-analytics"), null);
      assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-settings]")!.hidden, true);
      assert.equal(env.document.querySelector<HTMLElement>("[data-analytics-consent]")!.hidden, true);
    } finally { dispose?.(); env.restore(); }
  }
});

test("blocked browser storage keeps analytics off and reports an accessible status", () => {
  const env = environment(); env.blockStorage(); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent(); env.click('[data-analytics-choice="accept"]');
    assert.equal(env.document.getElementById("fireball-google-analytics"), null); assert.equal(env.target.dataLayer, undefined);
    assert.match(env.document.querySelector("[data-analytics-status]")!.textContent!, /could not save.*remains off/);
  } finally { dispose?.(); env.restore(); }
});

test("a browser tag error leaves the site usable and exposes an honest preference status", async () => {
  const env = environment(); let dispose: (() => void) | undefined;
  try {
    dispose = initAnalyticsConsent(); env.click('[data-analytics-choice="accept"]');
    const script = env.document.getElementById("fireball-google-analytics") as HTMLScriptElement;
    script.onerror?.call(script, new Event("error"));
    await Promise.resolve(); await Promise.resolve();
    assert.equal(env.views().length, 0); assert.equal(env.document.getElementById("fireball-google-analytics"), null);
    assert.equal(env.target["ga-disable-" + id], true);
    env.click("[data-analytics-settings]");
    assert.match(env.document.querySelector("[data-analytics-status]")!.textContent!, /could not load.*website still works/);
  } finally { dispose?.(); env.restore(); }
});
