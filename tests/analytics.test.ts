import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_LIFETIME, ANALYTICS_CONSENT_VERSION, analyticsCookieExpirations,
  createAnalyticsController, getAnalyticsPage, getSafeAnalyticsReferrer, isAnalyticsOrigin,
  readAnalyticsConfig, readConsent, serialiseConsent, type AnalyticsBrowser, type AnalyticsCommand,
} from "../src/lib/analytics.ts";

const id = "G-7RV5GM0GCF";
const origin = "https://fireballstudios.co.uk";
const routes = { "/": "Fireball Studios", "/projects": "Selected Projects", "/contact": "Start a Project" };
const now = Date.UTC(2026, 10, 13);
function mockBrowser(preference: string | null = null) {
  const commands: AnalyticsCommand[] = [], operations: string[] = [];
  let time = now, saved = preference, blockedRead = false, blockedWrite = false, silentWrite = false;
  let cookies = "_ga=existing-client; _ga_7RV5GM0GCF=existing-session";
  let listener: (() => void) | undefined, scheduled: (() => void) | undefined;
  let loads = 0, clears = 0, loaded = false, ignoreAbort = false;
  let resolve!: () => void, reject!: (error: Error) => void;
  const claimed = new Set<string>();
  const port: AnalyticsBrowser = {
    allowedOrigin: true, now: () => time,
    readPreference() { if (blockedRead) throw new Error("Storage blocked"); return saved; },
    writePreference(value) { if (blockedWrite) throw new Error("Storage blocked"); if (!silentWrite) saved = value; },
    setDisabled(value) { operations.push("disabled:" + value); },
    clearCookies() { clears++; cookies = ""; operations.push("clear"); },
    command(...args) { commands.push(args); operations.push(args[0] === "consent" ? "consent:" + args[1] + ":" + (args[2] as Record<string, string>).analytics_storage : String(args[0])); },
    hasLoadedScript: () => loaded,
    loadScript(signal) {
      loads++;
      return new Promise<void>((yes, no) => {
        resolve = () => { loaded = true; yes(); }; reject = no;
        signal.addEventListener("abort", () => { if (!ignoreAbort) no(new Error("Cancelled")); }, { once: true });
      });
    },
    claimPageView(page) { if (claimed.has(page)) return false; claimed.add(page); return true; },
    subscribePreference(callback) { listener = callback; return () => { listener = undefined; }; },
    schedule(callback) { scheduled = callback; return () => { scheduled = undefined; }; },
  };
  return { port, commands, operations,
    views: () => commands.filter((command) => command[0] === "event"),
    loads: () => loads, clears: () => clears, cookies: () => cookies, saved: () => saved,
    resolve: async () => { resolve(); await Promise.resolve(); await Promise.resolve(); },
    reject: async () => { reject(new Error("Tag blocked")); await Promise.resolve(); await Promise.resolve(); },
    blockRead: (value: boolean) => { blockedRead = value; }, blockWrite: (value: boolean) => { blockedWrite = value; },
    silentWrite: (value: boolean) => { silentWrite = value; }, ignoreAbort: () => { ignoreAbort = true; },
    storage(value: string | null) { saved = value; listener?.(); },
    advance(duration: number) { time += duration; scheduled?.(); },
    restoreVisit() { claimed.clear(); },
  };
}
function connect(browser: ReturnType<typeof mockBrowser>, path = "/projects/", referrer = "") {
  const controller = createAnalyticsController(id, routes, origin, referrer);
  controller.setPath(path);
  const dispose = controller.connect(browser.port);
  return { controller, dispose };
}

test("runtime config accepts only fixed brand HTTPS origins, static normalised routes and valid IDs", () => {
  assert.deepEqual(readAnalyticsConfig(JSON.stringify({ measurementId: id, origin, routes })), { measurementId: id, origin, routes });
  for (const value of [null, "null", "broken", JSON.stringify({ measurementId: "AW-private", origin, routes }), JSON.stringify({ measurementId: id, origin: "https://preview.netlify.app", routes }), JSON.stringify({ measurementId: id, origin, routes: { "/contact?email=private": "Bad" } }), JSON.stringify({ measurementId: id, origin, routes: { "/contact/": "Bad" } })]) assert.equal(readAnalyticsConfig(value), null);
  assert.equal(isAnalyticsOrigin(origin, origin), true);
  assert.equal(isAnalyticsOrigin("https://www.fireballstudios.co.uk", origin), true);
  for (const candidate of ["http://fireballstudios.co.uk", "https://fireballstudios.co.uk.evil.example", "https://user:secret@fireballstudios.co.uk", "https://fireballstudios.co.uk:3000", "http://localhost:5175", "https://preview.netlify.app"]) assert.equal(isAnalyticsOrigin(candidate, origin), false, candidate);
});

test("preferences are versioned, bounded and expire exactly 90 days after the recorded choice", () => {
  assert.equal(readConsent(serialiseConsent("accepted", now), now)?.choice, "accepted");
  assert.equal(readConsent(serialiseConsent("rejected", now), now)?.choice, "rejected");
  for (const value of [null, "null", "[]", "broken", "x".repeat(513), serialiseConsent("accepted", now + 1), serialiseConsent("accepted", now - ANALYTICS_CONSENT_LIFETIME), JSON.stringify({ version: ANALYTICS_CONSENT_VERSION + 1, choice: "accepted", createdAt: now, expiresAt: now + ANALYTICS_CONSENT_LIFETIME }), JSON.stringify({ version: 1, choice: "accepted", createdAt: now, expiresAt: now + 10 })]) assert.equal(readConsent(value, now), null);
});

test("no preference or rejection queues no Google command or script request", () => {
  for (const preference of [null, serialiseConsent("rejected", now)]) {
    const browser = mockBrowser(preference); const { controller, dispose } = connect(browser);
    controller.choose("rejected");
    assert.equal(browser.loads(), 0); assert.deepEqual(browser.commands, []);
    assert.equal(controller.getSnapshot().choice, "rejected"); assert.equal(browser.cookies(), ""); dispose();
  }
});

test("landing pathname is set before stored acceptance: exactly one safe manual view, no home view", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const { controller, dispose } = connect(browser, "/contact/", "https://www.google.co.uk/search?q=private@example.com");
  assert.equal(browser.loads(), 1); assert.equal(browser.views().length, 0);
  await browser.resolve(); controller.setPath("/contact"); controller.setPath("/contact/");
  assert.deepEqual(browser.views(), [["event", "page_view", { page_location: origin + "/contact/", page_title: "Start a Project", page_referrer: "https://www.google.co.uk/", send_to: id }]]);
  const config = browser.commands.find((command) => command[0] === "config")![2] as Record<string, unknown>;
  const safeSet = browser.commands.findIndex((command) => command[0] === "set");
  const grant = browser.commands.findIndex((command) => command[0] === "consent" && command[1] === "update" && (command[2] as Record<string, string>).analytics_storage === "granted");
  assert.ok(safeSet >= 0 && grant > safeSet, "safe page/global flags precede the first grant");
  assert.deepEqual(browser.commands[safeSet][1], { page_location: origin + "/contact/", page_title: "Start a Project", page_referrer: "https://www.google.co.uk/", allow_google_signals: false, allow_ad_personalization_signals: false });
  assert.equal(config.send_page_view, false); assert.equal(config.cookie_domain, "none"); assert.equal(config.cookie_update, false);
  assert.equal(config.allow_google_signals, false); assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_expires, ANALYTICS_CONSENT_LIFETIME / 1000);
  assert.doesNotMatch(JSON.stringify(browser.commands), /private@example/);
  for (const command of browser.commands.filter((item) => item[0] === "consent")) {
    const consent = command[2] as Record<string, string>;
    assert.equal(consent.ad_storage, "denied"); assert.equal(consent.ad_user_data, "denied"); assert.equal(consent.ad_personalization, "denied");
  }
  dispose();
});

test("unknown paths never load a tag; queries/fragments cannot enter page parameters", async () => {
  for (const path of ["/contact?email=private@example.com", "/contact#brief", "/people/private@example.com", "//", "/contact//", "/Contact", "/\\evil.example"]) assert.equal(getAnalyticsPage(path, routes, origin), null, path);
  const browser = mockBrowser(serialiseConsent("accepted", now));
  const { controller, dispose } = connect(browser, "/private/person@example.com");
  assert.equal(browser.loads(), 0);
  controller.setPath("/projects/"); await browser.resolve();
  controller.setPath("/unknown/private"); assert.equal(browser.operations.at(-1), "disabled:true");
  assert.doesNotMatch(JSON.stringify(browser.commands), /person@example|unknown|private/); dispose();
});

test("safe referrers retain known local routes and approved public origins without private URL detail", () => {
  assert.equal(getSafeAnalyticsReferrer(origin + "/projects/?email=private#brief", routes, origin), origin + "/projects/");
  assert.equal(getSafeAnalyticsReferrer("https://www.fireballstudios.co.uk/contact?name=private", routes, origin), origin + "/contact/");
  for (const ref of ["https://www.google.com/search?q=private#fragment", "https://www.bing.com/search?q=private", "https://duckduckgo.com/?q=private", "https://www.linkedin.com/in/private-person?query=private"]) assert.equal(getSafeAnalyticsReferrer(ref, routes, origin), new URL(ref).origin + "/");
  for (const ref of ["", "https://private.example/person", origin + "/private/person@example.com", "https://www.google.com.evil.example/search", "https://user:secret@www.google.com/search", "http://www.google.com/search", "javascript:alert(1)", "https://www.google.com:9999/search", "https://www.google.com\\@evil.example/"]) assert.equal(getSafeAnalyticsReferrer(ref, routes, origin), "", ref);
});

test("withdrawal disables measurement before denying consent and purging cookies", async () => {
  const browser = mockBrowser(); const { controller, dispose } = connect(browser);
  controller.choose("accepted"); await browser.resolve();
  const at = browser.operations.length; controller.choose("rejected");
  const operations = browser.operations.slice(at);
  assert.equal(operations[0], "disabled:true");
  assert.ok(operations.indexOf("consent:update:denied") > 0);
  assert.ok(operations.indexOf("clear") > operations.indexOf("consent:update:denied"));
  controller.setPath("/contact"); assert.equal(browser.views().length, 1); assert.equal(browser.cookies(), ""); dispose();
});

test("withdrawal during a load prevents a late tag callback from configuring or tracking", async () => {
  const browser = mockBrowser(); browser.ignoreAbort(); const { controller, dispose } = connect(browser);
  controller.choose("accepted"); controller.choose("rejected"); await browser.resolve();
  assert.equal(browser.views().length, 0); assert.equal(browser.commands.some((item) => item[0] === "config"), false);
  assert.equal(browser.operations.at(-1), "clear"); dispose();
});

test("storage failures and silently ignored writes fail closed, including after cross-tab events", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now)); const { controller, dispose } = connect(browser); await browser.resolve();
  browser.blockWrite(true); controller.choose("rejected"); browser.storage(browser.saved()); controller.setPath("/contact");
  assert.equal(controller.getSnapshot().storageError, true); assert.equal(browser.views().length, 1); assert.equal(browser.cookies(), "");
  browser.blockWrite(false); controller.choose("accepted"); assert.equal(browser.views().length, 2); dispose();
  for (const failure of ["read", "silent"] as const) {
    const blocked = mockBrowser(); if (failure === "read") blocked.blockRead(true); else blocked.silentWrite(true);
    const connection = connect(blocked); connection.controller.choose("accepted");
    assert.equal(blocked.loads(), 0); assert.equal(connection.controller.getSnapshot().storageError, true); connection.dispose();
  }
});

test("cross-tab rejection, removal and 90-day expiry stop collection and clear cookies", async () => {
  for (const action of ["reject", "remove", "expire"] as const) {
    const browser = mockBrowser(serialiseConsent("accepted", now)); const { controller, dispose } = connect(browser); await browser.resolve();
    if (action === "reject") browser.storage(serialiseConsent("rejected", now));
    else if (action === "remove") browser.storage(null); else browser.advance(ANALYTICS_CONSENT_LIFETIME);
    controller.setPath("/contact"); assert.equal(browser.views().length, 1); assert.equal(browser.cookies(), "");
    assert.notEqual(controller.getSnapshot().choice, "accepted"); dispose();
  }
});

test("valid accepted cookies survive ordinary MPA teardown and restored-document reconnect", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now)); const first = connect(browser); await browser.resolve();
  const cookies = browser.cookies(), cleared = browser.clears();
  const defaults = browser.commands.filter((item) => item[0] === "consent" && item[1] === "default").length;
  first.dispose(); assert.equal(browser.cookies(), cookies); assert.equal(browser.clears(), cleared);
  const second = connect(browser);
  assert.equal(browser.cookies(), cookies); assert.equal(browser.clears(), cleared);
  assert.equal(browser.views().length, 1, "same-document reinitialisation does not duplicate a view");
  assert.equal(browser.commands.filter((item) => item[0] === "consent" && item[1] === "default").length, defaults, "loaded tag does not receive a new denied default");
  second.dispose(); browser.restoreVisit(); const restored = connect(browser);
  assert.equal(browser.views().length, 2, "an explicit BFCache return counts one new visit");
  assert.equal(browser.loads(), 1); assert.equal(browser.cookies(), cookies); restored.dispose();
});

test("new MPA documents configure send_page_view false and retain the original preference/cookie lifetime", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now - 20 * 24 * 60 * 60 * 1000));
  const connection = connect(browser); await browser.resolve(); connection.dispose();
  const config = browser.commands.find((item) => item[0] === "config")![2] as Record<string, unknown>;
  assert.equal(config.cookie_expires, 70 * 24 * 60 * 60);
  assert.notEqual(browser.cookies(), "");
  const next = mockBrowser(browser.saved()); const nextConnection = connect(next, "/contact/"); await next.resolve();
  assert.equal(next.views().length, 1); assert.equal((next.commands.find((item) => item[0] === "config")![2] as Record<string, unknown>).send_page_view, false);
  nextConnection.dispose(); assert.notEqual(next.cookies(), "");
});

test("a blocked tag reports an error without tracking; a later explicit acceptance may retry", async () => {
  const browser = mockBrowser(serialiseConsent("accepted", now)); const { controller, dispose } = connect(browser); await browser.reject();
  assert.equal(controller.getSnapshot().loadError, true); assert.equal(browser.views().length, 0);
  controller.setPath("/contact"); assert.equal(browser.loads(), 1);
  controller.choose("accepted"); assert.equal(browser.loads(), 2); await browser.resolve(); assert.equal(browser.views().length, 1); dispose();
});

test("GA cookie removal targets owned domains and paths while preserving unrelated cookies", () => {
  const values = analyticsCookieExpirations("_ga=client; _ga_7RV5GM0GCF=session; _gid=old; private-session=secret", "www.fireballstudios.co.uk", "/projects/study/");
  assert.ok(values.some((value) => value.includes("Path=/projects/study/")));
  assert.ok(values.some((value) => value.includes("Domain=.fireballstudios.co.uk")));
  assert.ok(values.every((value) => value.includes("Max-Age=0") && !value.includes("secret") && !value.includes("Domain=.co.uk")));
  assert.deepEqual(analyticsCookieExpirations("_ga=client", "evil.example"), []);
});
