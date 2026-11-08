import { shouldNoIndex, type SiteEnvironment } from "./environment";

export const ANALYTICS_PREFERENCE_KEY = "fireball-analytics-consent";
export const ANALYTICS_CONSENT_VERSION = 1;
export const ANALYTICS_CONSENT_LIFETIME = 90 * 24 * 60 * 60 * 1000;
export type AnalyticsChoice = "accepted" | "rejected";
export type AnalyticsRoutes = Readonly<Record<string, string>>;
export type AnalyticsCommand = readonly unknown[];

interface ConsentRecord {
  version: number;
  choice: AnalyticsChoice;
  createdAt: number;
  expiresAt: number;
}

export function isMeasurementId(value: unknown): value is string {
  return typeof value === "string" && /^G-[A-Z0-9]{6,20}$/.test(value);
}

/** Evaluate on the server; public settings alone must not enable preview tracking. */
export function getAnalyticsMeasurementId(env: SiteEnvironment = process.env): string | null {
  if (env.NODE_ENV !== "production" || env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true" || shouldNoIndex(env)) return null;
  if (env.CONTEXT !== "production" && env.VERCEL_ENV !== "production") return null;
  return isMeasurementId(env.NEXT_PUBLIC_GA_MEASUREMENT_ID) ? env.NEXT_PUBLIC_GA_MEASUREMENT_ID : null;
}

export function isAnalyticsOrigin(browserOrigin: string, canonicalOrigin: string): boolean {
  try {
    const canonical = new URL(canonicalOrigin);
    const browser = new URL(browserOrigin);
    return canonical.protocol === "https:" && browser.protocol === "https:" && !browser.port &&
      (browser.hostname === canonical.hostname || browser.hostname === "www." + canonical.hostname);
  } catch { return false; }
}

export function readConsent(value: string | null, now: number): ConsentRecord | null {
  if (!value || value.length > 512) return null;
  try {
    const record = JSON.parse(value) as Partial<ConsentRecord>;
    if (record.version !== ANALYTICS_CONSENT_VERSION || !["accepted", "rejected"].includes(record.choice ?? "")) return null;
    if (!Number.isSafeInteger(record.createdAt) || !Number.isSafeInteger(record.expiresAt)) return null;
    if (record.createdAt! < 0 || record.createdAt! > now || record.expiresAt! <= now) return null;
    if (record.expiresAt! - record.createdAt! !== ANALYTICS_CONSENT_LIFETIME) return null;
    return record as ConsentRecord;
  } catch { return null; }
}

export function serialiseConsent(choice: AnalyticsChoice, now: number): string {
  return JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice, createdAt: now, expiresAt: now + ANALYTICS_CONSENT_LIFETIME });
}

/** Unknown paths and URL parameters never enter analytics payloads. */
export function getAnalyticsPage(pathname: string, routes: AnalyticsRoutes, origin: string) {
  if (!pathname.startsWith("/") || /[?#\\]/.test(pathname)) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (!Object.prototype.hasOwnProperty.call(routes, path)) return null;
  return { path, page_location: origin + path, page_title: routes[path] };
}

/** GA cookies use a host-only domain here; also remove earlier parent-domain cookies. */
export function analyticsCookieExpirations(cookieHeader: string, hostname: string): string[] {
  const names = cookieHeader.split(";").map((part) => part.trim().split("=", 1)[0])
    .filter((name) => /^_ga(?:_[A-Za-z0-9]+)?$/.test(name));
  const labels = hostname.split(".");
  const domains = ["", ...labels.map((_, index) => labels.slice(index).join(".")).filter((domain) => domain.includes("."))];
  return [...new Set(names)].flatMap((name) => domains.flatMap((domain) => {
    const base = name + "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax; Secure";
    return domain ? [base + "; Domain=" + domain, base + "; Domain=." + domain] : [base];
  }));
}

export interface AnalyticsBrowser {
  allowedOrigin: boolean;
  now(): number;
  readPreference(): string | null;
  writePreference(value: string): void;
  setDisabled(disabled: boolean): void;
  clearCookies(): void;
  command(...args: AnalyticsCommand): void;
  loadScript(): Promise<void>;
  subscribePreference(listener: () => void): () => void;
  schedule(callback: () => void, delay: number): () => void;
}

export interface AnalyticsSnapshot {
  ready: boolean;
  available: boolean;
  choice: AnalyticsChoice | null;
  panelOpen: boolean;
  storageError: boolean;
  loadError: boolean;
}

const INITIAL_SNAPSHOT: AnalyticsSnapshot = { ready: false, available: false, choice: null, panelOpen: false, storageError: false, loadError: false };
const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };

/** An injected browser keeps consent transitions testable without contacting Google. */
export function createAnalyticsController(measurementId: string, routes: AnalyticsRoutes, origin: string) {
  let snapshot = INITIAL_SNAPSHOT;
  let browser: AnalyticsBrowser | null = null;
  let pathname = "/";
  let consentExpiresAt = 0;
  let loading = false;
  let loaded = false;
  let configured = false;
  let googleConsentGranted = false;
  let storageBlocked = false;
  let lastPage: string | null = null;
  let cancelExpiry: (() => void) | undefined;
  const listeners = new Set<() => void>();

  function publish(update: Partial<AnalyticsSnapshot>) {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  }

  function stop() {
    if (!browser) return;
    browser.setDisabled(true);
    // Disable measurement before a consent update can be processed by a loaded tag.
    if (loading || loaded) browser.command("consent", "update", denied);
    googleConsentGranted = false;
    browser.clearCookies();
    lastPage = null;
  }

  function permitted() {
    return Boolean(browser?.allowedOrigin && snapshot.choice === "accepted" && consentExpiresAt > browser.now());
  }

  function trackPage() {
    if (!browser || !loaded || !permitted()) return;
    const page = getAnalyticsPage(pathname, routes, origin);
    if (!page) { browser.setDisabled(true); lastPage = null; return; }
    browser.setDisabled(false);
    if (lastPage === page.path) return;
    const fields = { page_location: page.page_location, page_title: page.page_title, page_referrer: lastPage ? origin + lastPage : "" };
    if (!googleConsentGranted) {
      browser.command("consent", "update", { ...denied, analytics_storage: "granted" });
      googleConsentGranted = true;
    }
    if (!configured) {
      browser.command("js", new Date(browser.now()));
      browser.command("config", measurementId, {
        ...fields, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_domain: "none", cookie_path: "/", cookie_expires: ANALYTICS_CONSENT_LIFETIME / 1000,
        cookie_update: false, cookie_flags: "SameSite=Lax;Secure",
      });
      configured = true;
    }
    browser.command("set", fields);
    browser.command("event", "page_view", { ...fields, send_to: measurementId });
    lastPage = page.path;
  }

  function start() {
    if (!browser || !permitted() || !getAnalyticsPage(pathname, routes, origin)) return;
    if (loaded) { trackPage(); return; }
    if (loading || snapshot.loadError) return;
    loading = true;
    // Basic consent: even this local queue and the external script wait for acceptance.
    browser.command("consent", "default", denied);
    browser.loadScript().then(() => {
      loading = false;
      loaded = true;
      // A late script load must not override a withdrawal or expired preference.
      if (browser && !permitted()) { stop(); return; }
      trackPage();
    }).catch(() => {
      loading = false;
      if (browser) { browser.setDisabled(true); publish({ loadError: true }); }
    });
  }

  function refreshPreference(keepPanelOpen = false) {
    if (!browser) return;
    cancelExpiry?.();
    if (storageBlocked) { stop(); return; }
    let record: ConsentRecord | null;
    try { record = readConsent(browser.readPreference(), browser.now()); }
    catch {
      storageBlocked = true;
      consentExpiresAt = 0;
      stop();
      publish({ ready: true, available: true, choice: null, panelOpen: true, storageError: true });
      return;
    }
    consentExpiresAt = record?.expiresAt ?? 0;
    if (record?.choice !== "accepted") stop();
    publish({ ready: true, available: true, choice: record?.choice ?? null, panelOpen: keepPanelOpen || !record, storageError: false });
    if (record) {
      // Browsers clamp very long timeouts; re-check until the actual expiry is reached.
      cancelExpiry = browser.schedule(() => refreshPreference(snapshot.panelOpen), Math.min(record.expiresAt - browser.now(), 2_147_483_647));
    }
    if (record?.choice === "accepted") start();
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL_SNAPSHOT,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connect(port: AnalyticsBrowser) {
      browser = port;
      port.setDisabled(true);
      if (!port.allowedOrigin || !isMeasurementId(measurementId)) {
        publish({ ready: true, available: false });
        return () => { browser = null; };
      }
      refreshPreference();
      const unsubscribe = port.subscribePreference(() => refreshPreference(snapshot.panelOpen));
      return () => { cancelExpiry?.(); unsubscribe(); port.setDisabled(true); browser = null; };
    },
    setPath(path: string) {
      pathname = path;
      if (!browser) return;
      if (snapshot.choice === "accepted" && consentExpiresAt <= browser.now()) { refreshPreference(); return; }
      if (!getAnalyticsPage(pathname, routes, origin)) { browser.setDisabled(true); lastPage = null; return; }
      start();
    },
    choose(choice: AnalyticsChoice) {
      if (!snapshot.available || !browser?.allowedOrigin) return;
      // Withdrawal takes effect even when the browser subsequently refuses storage.
      if (choice === "rejected") stop();
      try {
        browser.writePreference(serialiseConsent(choice, browser.now()));
        // A successful read-back is required before analytics can be enabled.
        const saved = readConsent(browser.readPreference(), browser.now());
        if (saved?.choice !== choice) throw new Error("Preference unavailable");
      } catch {
        storageBlocked = true;
        consentExpiresAt = 0;
        cancelExpiry?.();
        stop();
        publish({ choice: choice === "rejected" ? "rejected" : null, panelOpen: true, storageError: true });
        return;
      }
      storageBlocked = false;
      refreshPreference();
    },
    openPreferences() { if (snapshot.available) publish({ panelOpen: true }); },
    closePreferences() { if (snapshot.choice) publish({ panelOpen: false }); },
  };
}

export type AnalyticsController = ReturnType<typeof createAnalyticsController>;
