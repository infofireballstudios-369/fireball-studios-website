import { analyticsHosts, isMeasurementId } from "./analytics-settings";
export { isMeasurementId } from "./analytics-settings";

export const ANALYTICS_PREFERENCE_KEY = "fireball-analytics-consent";
export const ANALYTICS_CONSENT_VERSION = 1;
export const ANALYTICS_CONSENT_LIFETIME = 90 * 24 * 60 * 60 * 1000;
export type AnalyticsChoice = "accepted" | "rejected";
export type AnalyticsRoutes = Readonly<Record<string, string>>;
export type AnalyticsCommand = readonly unknown[];
export interface AnalyticsConfig { measurementId: string; origin: string; routes: AnalyticsRoutes }
interface ConsentRecord { version: number; choice: AnalyticsChoice; createdAt: number; expiresAt: number }

const routePattern = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?\/?$/;
const publicReferrerOrigins = new Set([
  "https://www.google.com", "https://google.com", "https://www.google.co.uk", "https://google.co.uk",
  "https://www.bing.com", "https://bing.com", "https://duckduckgo.com", "https://www.duckduckgo.com",
  "https://search.yahoo.com", "https://search.brave.com", "https://www.ecosia.org", "https://ecosia.org",
  "https://www.facebook.com", "https://facebook.com", "https://m.facebook.com", "https://l.facebook.com", "https://lm.facebook.com",
  "https://www.instagram.com", "https://instagram.com", "https://l.instagram.com",
  "https://www.linkedin.com", "https://linkedin.com", "https://www.youtube.com", "https://youtube.com",
  "https://x.com", "https://www.x.com", "https://twitter.com", "https://www.twitter.com", "https://t.co",
]);

function brandOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/" || !analyticsHosts.some((host) => host === url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

/** Only the studio's HTTPS domains can collect consented visits. */
export function isAnalyticsOrigin(browserOrigin: string, canonicalOrigin: string): boolean {
  return Boolean(brandOrigin(browserOrigin) && brandOrigin(canonicalOrigin));
}

export function readAnalyticsConfig(value: string | null): AnalyticsConfig | null {
  if (!value || value.length > 20_000) return null;
  try {
    const input = JSON.parse(value) as Partial<AnalyticsConfig>;
    if (!input || !isMeasurementId(input.measurementId) || typeof input.origin !== "string" || !brandOrigin(input.origin) || !input.routes || typeof input.routes !== "object" || Array.isArray(input.routes)) return null;
    const entries = Object.entries(input.routes);
    if (!entries.length || entries.length > 40 || entries.some(([path, title]) => !routePattern.test(path) || (path !== "/" && path.endsWith("/")) || typeof title !== "string" || !title.trim() || title.length > 200 || /[\u0000-\u001f\u007f]/.test(title))) return null;
    return { measurementId: input.measurementId, origin: new URL(input.origin).origin, routes: Object.fromEntries(entries) };
  } catch { return null; }
}

export function readConsent(value: string | null, now: number): ConsentRecord | null {
  if (!value || value.length > 512 || !Number.isSafeInteger(now) || now < 0) return null;
  try {
    const record = JSON.parse(value) as Partial<ConsentRecord>;
    if (!record || typeof record !== "object" || Array.isArray(record) || Object.keys(record).some((key) => !["version", "choice", "createdAt", "expiresAt"].includes(key))) return null;
    if (record.version !== ANALYTICS_CONSENT_VERSION || !["accepted", "rejected"].includes(record.choice ?? "")) return null;
    if (!Number.isSafeInteger(record.createdAt) || !Number.isSafeInteger(record.expiresAt) || record.createdAt! < 0 || record.createdAt! > now || record.expiresAt! <= now || record.expiresAt! - record.createdAt! !== ANALYTICS_CONSENT_LIFETIME) return null;
    return record as ConsentRecord;
  } catch { return null; }
}

export function serialiseConsent(choice: AnalyticsChoice, now: number): string {
  if (!["accepted", "rejected"].includes(choice) || !Number.isSafeInteger(now) || now < 0) throw new Error("Invalid analytics preference");
  return JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice, createdAt: now, expiresAt: now + ANALYTICS_CONSENT_LIFETIME });
}

/** URL parameters, fragments, unknown paths and browser-derived titles never enter events. */
export function getAnalyticsPage(pathname: string, routes: AnalyticsRoutes, origin: string) {
  const canonical = brandOrigin(origin);
  if (!canonical || !routePattern.test(pathname) || pathname.includes("//")) return null;
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  if (!Object.hasOwn(routes, path)) return null;
  return { path, page_location: canonical + (path === "/" ? "/" : path + "/"), page_title: routes[path] };
}

/** Preserve basic acquisition without exposing private referrer paths or query values. */
export function getSafeAnalyticsReferrer(value: string, routes: AnalyticsRoutes, origin: string): string {
  if (!value || value.length > 8192 || /[\u0000-\u0020\\]/.test(value)) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    if (analyticsHosts.some((host) => host === url.hostname)) return getAnalyticsPage(url.pathname, routes, origin)?.page_location ?? "";
    return publicReferrerOrigins.has(url.origin) ? url.origin + "/" : "";
  } catch { return ""; }
}

/** Remove accessible GA cookies, including older domain/path variants, while retaining other cookies. */
export function analyticsCookieExpirations(cookieHeader: string, hostname: string, pathname = "/"): string[] {
  if (!analyticsHosts.some((host) => host === hostname)) return [];
  const names = [...new Set(cookieHeader.split(";").map((part) => part.trim().split("=", 1)[0]).filter((name) => /^_ga(?:_[A-Za-z0-9]+)?$|^_gid$|^_gat(?:_[A-Za-z0-9_]+)?$/.test(name)))];
  const domains = ["", hostname, analyticsHosts[0]];
  const paths = new Set(["/"]);
  if (routePattern.test(pathname)) {
    const segments = pathname.split("/").filter(Boolean);
    for (let count = 1; count <= segments.length; count++) {
      const path = "/" + segments.slice(0, count).join("/"); paths.add(path); paths.add(path + "/");
    }
  }
  return names.flatMap((name) => [...paths].flatMap((path) => [...new Set(domains)].flatMap((domain) => {
    const base = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}; SameSite=Lax; Secure`;
    return domain ? [base + "; Domain=" + domain, base + "; Domain=." + domain] : [base];
  })));
}

export interface AnalyticsBrowser {
  allowedOrigin: boolean;
  now(): number;
  readPreference(): string | null;
  writePreference(value: string): void;
  setDisabled(disabled: boolean): void;
  clearCookies(): void;
  command(...args: AnalyticsCommand): void;
  loadScript(signal: AbortSignal): Promise<void>;
  hasLoadedScript?(): boolean;
  claimPageView?(pageLocation: string): boolean;
  subscribePreference(listener: () => void): () => void;
  schedule(callback: () => void, delay: number): () => void;
}
export interface AnalyticsSnapshot { ready: boolean; available: boolean; choice: AnalyticsChoice | null; panelOpen: boolean; storageError: boolean; loadError: boolean; loading: boolean }
const initialSnapshot: AnalyticsSnapshot = { ready: false, available: false, choice: null, panelOpen: false, storageError: false, loadError: false, loading: false };
const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };

/** Basic opt-in controller; the injected browser can be tested without contacting Google. */
export function createAnalyticsController(measurementId: string, routes: AnalyticsRoutes, origin: string, referrer = "") {
  let snapshot = { ...initialSnapshot };
  let browser: AnalyticsBrowser | null = null;
  let pathname = "";
  let consentExpiresAt = 0;
  let loaded = false, loading = false, configured = false, granted = false, storageBlocked = false;
  let lastPage: string | null = null;
  let epoch = 0;
  let scriptController: AbortController | undefined;
  let cancelExpiry: (() => void) | undefined;
  const listeners = new Set<() => void>();
  function publish(update: Partial<AnalyticsSnapshot>) { snapshot = { ...snapshot, ...update }; listeners.forEach((listener) => listener()); }
  function cancelPending() { epoch++; scriptController?.abort(); scriptController = undefined; loading = false; }
  function stop() {
    if (!browser) return;
    browser.setDisabled(true);
    try { if (loading || loaded || browser.hasLoadedScript?.()) browser.command("consent", "update", { ...denied }); } catch { /* Measurement is already disabled; withdrawal must continue. */ }
    cancelPending();
    granted = false;
    browser.clearCookies();
    lastPage = null;
  }
  const permitted = () => Boolean(browser?.allowedOrigin && snapshot.choice === "accepted" && consentExpiresAt > browser.now() && !storageBlocked);
  function trackPage() {
    if (!browser || !loaded || !permitted()) return;
    const page = getAnalyticsPage(pathname, routes, origin);
    if (!page) { browser.setDisabled(true); lastPage = null; return; }
    browser.setDisabled(false);
    if (lastPage === page.path) return;
    const fields = { page_location: page.page_location, page_title: page.page_title, page_referrer: lastPage ? getAnalyticsPage(lastPage, routes, origin)!.page_location : getSafeAnalyticsReferrer(referrer, routes, origin) };
    try {
      // A consent grant can wake a loaded tag. Apply safe globals first so those
      // actions cannot fall back to the browser's raw URL, referrer or title.
      browser.command("set", { ...fields, allow_google_signals: false, allow_ad_personalization_signals: false });
      if (!granted) { browser.command("consent", "update", { ...denied, analytics_storage: "granted" }); granted = true; }
      if (!configured) {
        browser.command("js", new Date(browser.now()));
        browser.command("config", measurementId, { ...fields, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: "none", cookie_path: "/", cookie_expires: Math.max(1, Math.floor((consentExpiresAt - browser.now()) / 1000)), cookie_update: false, cookie_flags: "SameSite=Lax;Secure" });
        configured = true;
      }
      if (!browser.claimPageView || browser.claimPageView(page.page_location)) browser.command("event", "page_view", { ...fields, send_to: measurementId });
      lastPage = page.path;
    } catch { browser.setDisabled(true); publish({ loadError: true }); }
  }
  function start() {
    if (!browser || !permitted() || !getAnalyticsPage(pathname, routes, origin)) return;
    // A restored document already has a consented tag. Do not reapply a denied
    // default to that running tag and disrupt its valid cookies/session.
    if (browser.hasLoadedScript?.()) loaded = true;
    if (loaded) { trackPage(); return; }
    if (loading || snapshot.loadError) return;
    const port = browser;
    const run = ++epoch;
    scriptController = new AbortController();
    loading = true;
    publish({ loading: true });
    try {
      // Even Google's local queue and script request wait for recorded acceptance.
      port.command("consent", "default", { ...denied });
      void port.loadScript(scriptController.signal).then(() => {
        if (browser !== port || run !== epoch) return;
        loading = false; loaded = true; scriptController = undefined;
        publish({ loading: false });
        if (!permitted()) { stop(); return; }
        trackPage();
      }).catch(() => {
        if (browser !== port || run !== epoch) return;
        loading = false; scriptController = undefined; port.setDisabled(true); publish({ loading: false, loadError: true });
      });
    } catch { loading = false; port.setDisabled(true); publish({ loading: false, loadError: true }); }
  }
  function refreshPreference(keepPanelOpen = false) {
    if (!browser) return;
    cancelExpiry?.(); cancelExpiry = undefined;
    if (storageBlocked) { stop(); return; }
    let record: ConsentRecord | null;
    try { record = readConsent(browser.readPreference(), browser.now()); }
    catch {
      storageBlocked = true; consentExpiresAt = 0; stop();
      publish({ ready: true, available: true, choice: null, panelOpen: true, storageError: true, loading: false }); return;
    }
    consentExpiresAt = record?.expiresAt ?? 0;
    if (record?.choice !== "accepted") stop();
    publish({ ready: true, available: true, choice: record?.choice ?? null, panelOpen: keepPanelOpen || !record, storageError: false, loading: false });
    if (record) cancelExpiry = browser.schedule(() => refreshPreference(snapshot.panelOpen), Math.min(record.expiresAt - browser.now(), 2_147_483_647));
    if (record?.choice === "accepted") start();
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connect(port: AnalyticsBrowser) {
      browser = port; port.setDisabled(true);
      if (!port.allowedOrigin || !isMeasurementId(measurementId) || !brandOrigin(origin)) { publish({ ready: true, available: false }); return () => { browser = null; }; }
      refreshPreference();
      const unsubscribe = port.subscribePreference(() => refreshPreference(snapshot.panelOpen));
      return () => {
        cancelExpiry?.(); cancelExpiry = undefined; unsubscribe();
        if (browser !== port) return;
        let preserve = false;
        try { preserve = readConsent(port.readPreference(), port.now())?.choice === "accepted" && !storageBlocked; } catch { /* Fail closed if preference storage becomes unavailable. */ }
        if (preserve) { port.setDisabled(true); cancelPending(); }
        else stop();
        browser = null;
      };
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
      if (choice === "rejected") stop();
      try {
        const value = serialiseConsent(choice, browser.now()); browser.writePreference(value);
        if (browser.readPreference() !== value) throw new Error("Preference unavailable");
      } catch {
        storageBlocked = true; consentExpiresAt = 0; cancelExpiry?.(); stop();
        publish({ choice: choice === "rejected" ? "rejected" : null, panelOpen: true, storageError: true, loading: false }); return;
      }
      storageBlocked = false;
      if (choice === "accepted" && snapshot.loadError) publish({ loadError: false });
      refreshPreference();
    },
    openPreferences() { if (snapshot.available) publish({ panelOpen: true }); },
    closePreferences() { if (snapshot.choice) publish({ panelOpen: false }); },
  };
}
export type AnalyticsController = ReturnType<typeof createAnalyticsController>;
