import {
  ANALYTICS_PREFERENCE_KEY, analyticsCookieExpirations, createAnalyticsController, getAnalyticsPage,
  isAnalyticsOrigin, readAnalyticsConfig, type AnalyticsBrowser, type AnalyticsCommand,
} from "../lib/analytics";

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };
type ScriptSlot = { measurementId: string; script: HTMLScriptElement; loaded: boolean; promise: Promise<void> };
const scripts = new WeakMap<Document, ScriptSlot>();
const visits = new WeakMap<Document, Set<string>>();

/** Browser transport is inert until the controller calls command/loadScript after acceptance. */
export function createBrowserAnalyticsPort(measurementId: string, origin: string, restored = false): AnalyticsBrowser {
  const target = window as unknown as AnalyticsWindow;
  if (restored) visits.delete(document);
  const claimed = visits.get(document) ?? new Set<string>();
  visits.set(document, claimed);
  const doc = document;
  return {
    allowedOrigin: isAnalyticsOrigin(window.location.origin, origin),
    now: () => Date.now(),
    readPreference: () => window.localStorage.getItem(ANALYTICS_PREFERENCE_KEY),
    writePreference: (value) => window.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, value),
    setDisabled: (disabled) => { target[`ga-disable-${measurementId}`] = disabled; },
    clearCookies: () => {
      try { for (const cookie of analyticsCookieExpirations(doc.cookie, window.location.hostname, window.location.pathname)) doc.cookie = cookie; }
      catch { /* Cookie blocking must not prevent withdrawal. */ }
    },
    command(...args: AnalyticsCommand) {
      target.dataLayer ??= [];
      // Google's queue requires an arguments object rather than an array or JSON string.
      target.gtag ??= function () { target.dataLayer!.push(arguments); };
      target.gtag(...args);
    },
    claimPageView(pageLocation) {
      const key = measurementId + " " + pageLocation;
      if (claimed.has(key)) return false;
      claimed.add(key); return true;
    },
    hasLoadedScript: () => Boolean(scripts.get(doc)?.loaded),
    loadScript(signal) {
      if (signal.aborted) return Promise.reject(new Error("Analytics cancelled"));
      const previous = scripts.get(doc);
      if (previous) return previous.measurementId === measurementId ? previous.promise : Promise.reject(new Error("Another analytics tag is present"));
      if (doc.getElementById("fireball-google-analytics")) return Promise.reject(new Error("An unmanaged analytics tag is present"));
      const script = doc.createElement("script");
      script.id = "fireball-google-analytics";
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
      script.referrerPolicy = "no-referrer";
      let resolve!: () => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
      const slot: ScriptSlot = { measurementId, script, loaded: false, promise };
      scripts.set(doc, slot);
      const tidy = () => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        script.onload = null; script.onerror = null;
      };
      const fail = () => { tidy(); script.remove(); if (scripts.get(doc) === slot) scripts.delete(doc); reject(new Error("Analytics unavailable")); };
      const abort = () => fail();
      const timer = window.setTimeout(fail, 12_000);
      script.onload = () => { tidy(); slot.loaded = true; resolve(); };
      script.onerror = fail;
      signal.addEventListener("abort", abort, { once: true });
      try { doc.head.append(script); } catch { fail(); }
      return promise;
    },
    subscribePreference(listener) {
      const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === ANALYTICS_PREFERENCE_KEY) listener(); };
      const onVisibility = () => { if (doc.visibilityState === "visible") listener(); };
      window.addEventListener("storage", onStorage);
      doc.addEventListener("visibilitychange", onVisibility);
      return () => { window.removeEventListener("storage", onStorage); doc.removeEventListener("visibilitychange", onVisibility); };
    },
    schedule(callback, delay) { const timer = window.setTimeout(callback, delay); return () => window.clearTimeout(timer); },
  };
}

let removeAnalyticsConsent: (() => void) | undefined;

/** Wire the semantic preference panel without loading a Google tag before acceptance. */
export function initAnalyticsConsent({ restored = false }: { restored?: boolean } = {}): () => void {
  removeAnalyticsConsent?.();
  const panel = document.querySelector<HTMLElement>("[data-analytics-consent]");
  const settings = [...document.querySelectorAll<HTMLButtonElement>("[data-analytics-settings]")];
  const config = readAnalyticsConfig(document.getElementById("fireball-analytics-config")?.textContent ?? null);
  const accept = panel?.querySelector<HTMLButtonElement>('[data-analytics-choice="accept"]');
  const reject = panel?.querySelector<HTMLButtonElement>('[data-analytics-choice="reject"]');
  if (!config || !panel || !settings.length || !accept || !reject || !isAnalyticsOrigin(window.location.origin, config.origin) || !getAnalyticsPage(window.location.pathname, config.routes, config.origin)) {
    if (panel) panel.hidden = true;
    settings.forEach((button) => { button.hidden = true; button.setAttribute("aria-expanded", "false"); });
    return () => {};
  }
  const controller = createAnalyticsController(config.measurementId, config.routes, config.origin, restored ? "" : document.referrer);
  const port = createBrowserAnalyticsPort(config.measurementId, config.origin, restored);
  const events = new AbortController();
  const status = panel.querySelector<HTMLElement>("[data-analytics-status]");
  const close = panel.querySelector<HTMLButtonElement>("[data-analytics-close]");
  const withdraw = panel.querySelector<HTMLButtonElement>("[data-analytics-withdraw]");
  let opener = settings[0];
  const render = () => {
    const state = controller.getSnapshot();
    const wasVisible = !panel.hidden;
    panel.hidden = !state.available || !state.panelOpen;
    settings.forEach((button) => { button.hidden = !state.available; button.setAttribute("aria-expanded", String(!panel.hidden)); });
    if (close) close.hidden = !state.choice;
    if (withdraw) withdraw.hidden = state.choice !== "accepted";
    if (status) status.textContent = state.storageError ? "Your browser could not save this choice. Analytics remains off. You can keep using the website."
      : state.loadError ? "Analytics could not load. Your choice is saved and the website still works."
      : state.loading ? "Your choice is saved. Loading optional analytics…"
      : state.choice === "accepted" ? "Analytics is accepted. You can withdraw consent at any time."
      : state.choice === "rejected" ? "Analytics is off. You can change this choice at any time."
      : "Analytics remains off until you accept.";
    if (wasVisible && panel.hidden && panel.contains(document.activeElement)) opener.focus({ preventScroll: true });
  };
  const unsubscribe = controller.subscribe(render);
  // The landing path must be known before a stored acceptance can start the tag.
  controller.setPath(window.location.pathname);
  const disconnect = controller.connect(port);
  settings.forEach((button) => button.addEventListener("click", () => {
    opener = button;
    controller.openPreferences();
    panel.focus({ preventScroll: true });
  }, { signal: events.signal }));
  accept.addEventListener("click", () => controller.choose("accepted"), { signal: events.signal });
  reject.addEventListener("click", () => controller.choose("rejected"), { signal: events.signal });
  withdraw?.addEventListener("click", () => controller.choose("rejected"), { signal: events.signal });
  close?.addEventListener("click", () => controller.closePreferences(), { signal: events.signal });
  panel.addEventListener("keydown", (event) => { if (event.key === "Escape" && controller.getSnapshot().choice) { event.preventDefault(); controller.closePreferences(); } }, { signal: events.signal });
  render();
  let stopped = false;
  removeAnalyticsConsent = () => {
    if (stopped) return;
    stopped = true;
    events.abort(); unsubscribe(); disconnect();
    panel.hidden = true;
    settings.forEach((button) => { button.hidden = true; button.setAttribute("aria-expanded", "false"); });
  };
  return removeAnalyticsConsent;
}
