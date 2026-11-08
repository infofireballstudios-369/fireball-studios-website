"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  ANALYTICS_PREFERENCE_KEY, analyticsCookieExpirations, createAnalyticsController, isAnalyticsOrigin, isMeasurementId,
  type AnalyticsBrowser, type AnalyticsCommand, type AnalyticsController, type AnalyticsRoutes,
} from "@/lib/analytics";

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined };
let scriptPromise: Promise<void> | null = null;

function browserPort(measurementId: string, origin: string): AnalyticsBrowser {
  const target = window as unknown as AnalyticsWindow;
  function command(...args: AnalyticsCommand) {
    target.dataLayer ??= [];
    // gtag expects an arguments object in its queue, not an array or JSON string.
    // eslint-disable-next-line prefer-rest-params -- Preserve Google's documented gtag queue format.
    target.gtag ??= function () { target.dataLayer!.push(arguments); };
    target.gtag(...args);
  }
  return {
    allowedOrigin: isAnalyticsOrigin(window.location.origin, origin),
    now: () => Date.now(),
    readPreference: () => window.localStorage.getItem(ANALYTICS_PREFERENCE_KEY),
    writePreference: (value) => window.localStorage.setItem(ANALYTICS_PREFERENCE_KEY, value),
    setDisabled: (disabled) => { target[`ga-disable-${measurementId}`] = disabled; },
    clearCookies: () => {
      try {
        for (const cookie of analyticsCookieExpirations(document.cookie, window.location.hostname)) document.cookie = cookie;
      } catch { /* A browser that blocks cookies must still permit withdrawal. */ }
    },
    command,
    loadScript: () => {
      if (scriptPromise) return scriptPromise;
      scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.id = "fireball-google-analytics";
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
        script.referrerPolicy = "no-referrer";
        const timeout = window.setTimeout(() => { script.remove(); reject(new Error("Analytics unavailable")); }, 12_000);
        script.onload = () => { window.clearTimeout(timeout); resolve(); };
        script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error("Analytics unavailable")); };
        document.head.appendChild(script);
      });
      return scriptPromise;
    },
    subscribePreference: (listener) => {
      const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === ANALYTICS_PREFERENCE_KEY) listener(); };
      const onVisibility = () => { if (document.visibilityState === "visible") listener(); };
      window.addEventListener("storage", onStorage);
      document.addEventListener("visibilitychange", onVisibility);
      return () => { window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVisibility); };
    },
    schedule: (callback, delay) => { const timer = window.setTimeout(callback, delay); return () => window.clearTimeout(timer); },
  };
}

const AnalyticsContext = createContext<AnalyticsController | null>(null);

export function AnalyticsPreferencesButton() {
  const controller = useContext(AnalyticsContext);
  return controller ? <PreferencesButton controller={controller} /> : null;
}

function PreferencesButton({ controller }: { controller: AnalyticsController }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  function open() {
    controller.openPreferences();
    // Move keyboard focus to the newly opened panel; closing restores this control.
    window.requestAnimationFrame(() => document.getElementById("analytics-consent-panel")?.focus());
  }
  if (!snapshot.available) return null;
  return <button type="button" className="analytics-preferences" onClick={open} aria-controls="analytics-consent-panel">Analytics preferences</button>;
}

interface AnalyticsConsentProps {
  measurementId: string | null;
  routes: AnalyticsRoutes;
  origin: string;
  children?: React.ReactNode;
}

export function AnalyticsConsent({ measurementId, ...props }: AnalyticsConsentProps) {
  if (!isMeasurementId(measurementId)) return <>{props.children}</>;
  return <ConfiguredAnalyticsConsent key={measurementId + props.origin} {...props} measurementId={measurementId} />;
}

function ConfiguredAnalyticsConsent({ measurementId, routes, origin, children }: AnalyticsConsentProps & { measurementId: string }) {
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();
  const [controller] = useState(() => createAnalyticsController(measurementId, routes, origin));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    controller.setPath(window.location.pathname);
    return controller.connect(browserPort(measurementId, origin));
  }, [controller, measurementId, origin]);
  useEffect(() => { if (pathname) controller.setPath(pathname); }, [controller, pathname]);

  function restoreFocus() {
    if (panel.current?.contains(document.activeElement)) {
      window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".analytics-preferences")?.focus());
    }
  }
  function choose(choice: "accepted" | "rejected") { restoreFocus(); controller.choose(choice); }

  return <AnalyticsContext.Provider value={controller}>
    {children}
    {snapshot.available && snapshot.panelOpen && <section ref={panel} id="analytics-consent-panel" className="analytics-consent" tabIndex={-1} aria-labelledby={titleId} aria-describedby={descriptionId}>
      <div className="analytics-consent__copy">
        <h2 id={titleId}>Your analytics choice</h2>
        <p id={descriptionId}>With your permission, Google Analytics helps us understand which pages people visit. It uses cookies and sends browsing information to Google. We do not use it for advertising or send enquiry details. You can change your choice at any time.</p>
        <Link href="/privacy">Read our privacy notice</Link>
        {snapshot.choice && <p className="analytics-consent__notice">Analytics is currently {snapshot.choice === "accepted" ? "accepted" : "rejected"}.</p>}
        {snapshot.storageError && <p className="analytics-consent__notice" role="status">Your browser could not save this preference. Analytics remains off. You can continue using the site.</p>}
        {snapshot.loadError && <p className="analytics-consent__notice" role="status">Analytics could not load. Your choice is saved and the website still works.</p>}
      </div>
      <div className="analytics-consent__actions">
        <button type="button" className="button button-outline" onClick={() => choose("accepted")}>Accept analytics</button>
        <button type="button" className="button button-outline" onClick={() => choose("rejected")}>Reject analytics</button>
        {snapshot.choice && <button type="button" className="analytics-preferences" onClick={() => { restoreFocus(); controller.closePreferences(); }}>Close preferences</button>}
      </div>
    </section>}
  </AnalyticsContext.Provider>;
}
