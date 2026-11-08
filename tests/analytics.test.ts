import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ANALYTICS_CONSENT_LIFETIME, ANALYTICS_CONSENT_VERSION, analyticsCookieExpirations,
  createAnalyticsController, getAnalyticsMeasurementId, getAnalyticsPage, isAnalyticsOrigin,
  readConsent, serialiseConsent, type AnalyticsBrowser, type AnalyticsCommand,
} from "../src/lib/analytics";
import { AnalyticsConsent, AnalyticsPreferencesButton } from "../src/components/ui/AnalyticsConsent";

const measurementId = "G-7RV5GM0GCF";
const origin = "https://fireballstudios.co.uk";
const routes = { "/": "Fireball Studios", "/projects": "Selected Projects", "/contact": "Start a Project" };
const now = Date.UTC(2026, 10, 8);

function mockBrowser(preference: string | null = null) {
  const commands: AnalyticsCommand[] = [];
  const disabled: boolean[] = [];
  let currentTime = now;
  let saved = preference;
  let readFails = false;
  let writeFails = false;
  let listener: (() => void) | undefined;
  let scheduled: (() => void) | undefined;
  let loads = 0;
  let clearCount = 0;
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const script = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const port: AnalyticsBrowser = {
    allowedOrigin: true,
    now: () => currentTime,
    readPreference: () => { if (readFails) throw new Error("Storage blocked"); return saved; },
    writePreference: (value) => { if (writeFails) throw new Error("Storage blocked"); saved = value; },
    setDisabled: (value) => { disabled.push(value); },
    clearCookies: () => { clearCount++; },
    command: (...args) => { commands.push(args); },
    loadScript: () => { loads++; return script; },
    subscribePreference: (callback) => { listener = callback; return () => { listener = undefined; }; },
    schedule: (callback) => { scheduled = callback; return () => { scheduled = undefined; }; },
  };
  return {
    port, commands, disabled,
    views: () => commands.filter((command) => command[0] === "event"),
    loads: () => loads,
    clearCount: () => clearCount,
    saved: () => saved,
    resolve: async () => { resolve(); await script; await Promise.resolve(); },
    reject: async () => { reject(new Error("Blocked script")); await script.catch(() => undefined); await Promise.resolve(); },
    readFails: (value: boolean) => { readFails = value; },
    writeFails: (value: boolean) => { writeFails = value; },
    storageEvent: (value: string | null) => { saved = value; listener?.(); },
    advance: (duration: number) => { currentTime += duration; scheduled?.(); },
  };
}

test("analytics needs valid production configuration and stays off on all preview contexts", () => {
  const enabled = { NODE_ENV: "production", CONTEXT: "production", NEXT_PUBLIC_ENABLE_ANALYTICS: "true", NEXT_PUBLIC_GA_MEASUREMENT_ID: measurementId };
  assert.equal(getAnalyticsMeasurementId(enabled), measurementId);
  assert.equal(getAnalyticsMeasurementId({ ...enabled, CONTEXT: undefined, VERCEL_ENV: "production" }), measurementId);
  for (const override of [
    { NODE_ENV: "development" }, { NEXT_PUBLIC_ENABLE_ANALYTICS: "false" }, { NEXT_PUBLIC_GA_MEASUREMENT_ID: "" },
    { NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-unsafe?id=value" }, { CONTEXT: "deploy-preview" }, { CONTEXT: "branch-deploy" },
    { CONTEXT: "dev" }, { CONTEXT: undefined }, { SITE_NOINDEX: "true" }, { VERCEL_ENV: "preview" },
  ]) assert.equal(getAnalyticsMeasurementId({ ...enabled, ...override }), null);
  assert.equal(isAnalyticsOrigin(origin, origin), true);
  assert.equal(isAnalyticsOrigin("https://www.fireballstudios.co.uk", origin), true);
  for (const url of ["http://fireballstudios.co.uk", "https://fireballstudios.co.uk.attacker.example", "https://preview.netlify.app", "http://localhost:3000", "https://fireballstudios.co.uk:3000"])
    assert.equal(isAnalyticsOrigin(url, origin), false);
});

test("preference parsing accepts only the current version within its 90-day lifetime", () => {
  assert.equal(readConsent(serialiseConsent("accepted", now), now)?.choice, "accepted");
  assert.equal(readConsent(serialiseConsent("rejected", now), now)?.choice, "rejected");
  for (const value of [null, "broken", "null", "[]", "x".repeat(513), serialiseConsent("accepted", now + 1), serialiseConsent("accepted", now - ANALYTICS_CONSENT_LIFETIME),
    JSON.stringify({ version: ANALYTICS_CONSENT_VERSION + 1, choice: "accepted", createdAt: now, expiresAt: now + ANALYTICS_CONSENT_LIFETIME })])
    assert.equal(readConsent(value, now), null);
});

test("no choice and a rejected preference never load a Google script or queue Google commands", () => {
  for (const preference of [null, serialiseConsent("rejected", now)]) {
    const browser = mockBrowser(preference);
    const controller = createAnalyticsController(measurementId, routes, origin);
    const disconnect = controller.connect(browser.port);
    controller.setPath("/projects");
    controller.choose("rejected");
    assert.equal(browser.loads(), 0);
    assert.deepEqual(browser.commands, []);
    assert.equal(controller.getSnapshot().choice, "rejected");
    assert.equal(browser.disabled.at(-1), true);
    disconnect();
  }
});

test("acceptance loads once and sends one safe page view per known route without replaying earlier visits", async () => {
  const browser = mockBrowser();
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.connect(browser.port);
  controller.setPath("/projects");
  controller.setPath("/contact");
  controller.choose("accepted");
  assert.equal(browser.loads(), 1);
  assert.equal(browser.views().length, 0);
  await browser.resolve();
  controller.setPath("/contact");
  controller.setPath("/contact/");
  assert.equal(browser.views().length, 1);
  assert.deepEqual(browser.views()[0], ["event", "page_view", { page_location: origin + "/contact", page_title: "Start a Project", page_referrer: "", send_to: measurementId }]);
  controller.setPath("/projects");
  controller.setPath("/projects");
  assert.equal(browser.views().length, 2);
  assert.equal((browser.views()[1][2] as Record<string, string>).page_referrer, origin + "/contact");
  assert.equal(browser.loads(), 1);
  const config = browser.commands.find((command) => command[0] === "config")![2] as Record<string, unknown>;
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_domain, "none");
  assert.equal(config.cookie_expires, ANALYTICS_CONSENT_LIFETIME / 1000);
});

test("unknown paths and parameters do not leak into analytics or enable measurement", async () => {
  for (const path of ["/contact?email=person@example.com", "/contact#private", "/people/person@example.com", "//example.com", "/\\example.com"])
    assert.equal(getAnalyticsPage(path, routes, origin), null);
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.setPath("/private/person@example.com");
  controller.connect(browser.port);
  assert.equal(browser.loads(), 0);
  controller.setPath("/projects");
  await browser.resolve();
  controller.setPath("/unrecognised");
  assert.equal(browser.disabled.at(-1), true);
  controller.setPath("/contact");
  assert.equal(browser.views().length, 2);
  assert.equal((browser.views()[1][2] as Record<string, string>).page_referrer, "");
  assert.doesNotMatch(JSON.stringify(browser.commands), /person@example|unrecognised|private/);
});

test("withdrawal before a late script load prevents every analytics event", async () => {
  const browser = mockBrowser();
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.connect(browser.port);
  controller.choose("accepted");
  controller.choose("rejected");
  await browser.resolve();
  controller.setPath("/projects");
  assert.equal(browser.disabled.at(-1), true);
  assert.equal(browser.views().length, 0);
  assert.equal(browser.commands.some((command) => command[0] === "config"), false);
  assert.equal(browser.loads(), 1);
});

test("withdrawal, storage changes and expiry stop dispatch; subsequent acceptance does not reload the script", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.connect(browser.port);
  await browser.resolve();
  assert.equal(browser.views().length, 1);
  controller.choose("rejected");
  controller.setPath("/projects");
  assert.equal(browser.views().length, 1);
  assert.equal(browser.disabled.at(-1), true);
  assert.ok(browser.clearCount() > 0);
  controller.choose("accepted");
  assert.equal(browser.loads(), 1);
  assert.equal(browser.views().length, 2);
  browser.storageEvent(serialiseConsent("rejected", now));
  controller.setPath("/contact");
  assert.equal(browser.views().length, 2);
  browser.storageEvent(serialiseConsent("accepted", now));
  assert.equal(browser.views().length, 3);
  browser.advance(ANALYTICS_CONSENT_LIFETIME);
  controller.setPath("/projects");
  assert.equal(browser.disabled.at(-1), true);
  assert.equal(controller.getSnapshot().choice, null);
  assert.equal(browser.views().length, 3);
});

test("blocked storage fails closed and cannot reactivate an old accepted preference after withdrawal", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.connect(browser.port);
  await browser.resolve();
  browser.writeFails(true);
  controller.choose("rejected");
  assert.equal(controller.getSnapshot().storageError, true);
  browser.storageEvent(browser.saved());
  controller.setPath("/contact");
  assert.equal(browser.disabled.at(-1), true);
  assert.equal(browser.views().length, 1);
  browser.writeFails(false);
  controller.choose("accepted");
  assert.equal(browser.views().length, 2);

  const blocked = mockBrowser();
  blocked.readFails(true);
  const other = createAnalyticsController(measurementId, routes, origin);
  other.connect(blocked.port);
  other.choose("accepted");
  assert.equal(blocked.loads(), 0);
  assert.equal(other.getSnapshot().storageError, true);
});

test("a blocked tag and a disallowed browser origin leave the website functional without tracking", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const controller = createAnalyticsController(measurementId, routes, origin);
  controller.connect(browser.port);
  await browser.reject();
  controller.setPath("/projects");
  assert.equal(browser.loads(), 1);
  assert.equal(browser.views().length, 0);
  assert.equal(browser.disabled.at(-1), true);
  assert.equal(controller.getSnapshot().loadError, true);
  controller.openPreferences();
  assert.equal(controller.getSnapshot().panelOpen, true);
  controller.choose("rejected");
  assert.equal(controller.getSnapshot().choice, "rejected");

  const preview = mockBrowser(serialiseConsent("accepted", now));
  preview.port.allowedOrigin = false;
  const other = createAnalyticsController(measurementId, routes, origin);
  other.connect(preview.port);
  assert.equal(preview.loads(), 0);
  assert.equal(other.getSnapshot().available, false);
});

test("cookie removal targets analytics cookies at the current host and parent domains only", () => {
  const deletions = analyticsCookieExpirations("_ga=one; _ga_7RV5GM0GCF=two; session=private; fireball-analytics-consent=accepted", "www.fireballstudios.co.uk");
  assert.ok(deletions.some((cookie) => cookie.startsWith("_ga=;") && !cookie.includes("Domain=")));
  assert.ok(deletions.some((cookie) => cookie.includes("Domain=.fireballstudios.co.uk")));
  assert.ok(deletions.every((cookie) => cookie.includes("Max-Age=0") && !cookie.startsWith("session") && !cookie.startsWith("fireball")));
  assert.deepEqual(analyticsCookieExpirations("session=private", "fireballstudios.co.uk"), []);
});

test("server rendering retains content with no scripts, preconnects, banners or analytics network hints", () => {
  for (const id of [null, "invalid", measurementId]) {
    const html = renderToStaticMarkup(createElement(AnalyticsConsent, {
      measurementId: id, routes, origin,
    }, createElement("main", null, "Crawlable content", createElement(AnalyticsPreferencesButton))));
    assert.match(html, /Crawlable content/);
    assert.doesNotMatch(html, /<script|googletagmanager|google-analytics|preconnect|Accept analytics|Analytics preferences/);
  }
});
