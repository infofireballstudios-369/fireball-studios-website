import { getFormEndpoint, getNetlifyFormUrl } from "./form-endpoint";
import { getAnalyticsMeasurementId } from "./analytics-settings";

export interface BuildConfig { siteUrl: string; noIndex: boolean; development: boolean; formEndpoint?: string; netlifyFormUrl?: string; formProvider?: "formsubmit" | "formspree" | "netlify" | "email"; gaMeasurementId?: string }

export function readBuildConfig(env: Record<string, string | undefined> = process.env, development = process.argv.includes("--dev")): BuildConfig {
  const value = env.SITE_URL || "https://fireballstudios.co.uk/";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("SITE_URL must be a plain absolute HTTP(S) website URL.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Public SITE_URL must use HTTPS.");
  const formEndpoint = getFormEndpoint(env.FORMSPREE_ENDPOINT);
  const netlifyFormUrl = getNetlifyFormUrl(env.NETLIFY_FORM_URL);
  const formProvider = env.FORM_PROVIDER || (formEndpoint ? "formspree" : "formsubmit");
  if (!["formsubmit", "formspree", "netlify", "email"].includes(formProvider)) throw new Error("FORM_PROVIDER must be formsubmit, formspree, netlify or email.");
  if (formProvider === "formspree" && !formEndpoint) throw new Error("Formspree requires a verified public FORMSPREE_ENDPOINT.");
  if (formProvider === "netlify" && !netlifyFormUrl) throw new Error("Netlify capture requires an explicitly configured NETLIFY_FORM_URL.");
  const siteUrl = url.href.replace(/\/?$/, "/");
  const noIndex = development || env.NOINDEX !== "false";
  const gaMeasurementId = getAnalyticsMeasurementId(env, { siteUrl, noIndex, development });
  return { siteUrl, noIndex, development, formEndpoint, netlifyFormUrl, formProvider: formProvider as BuildConfig["formProvider"], gaMeasurementId };
}

export function pagePrefix(route: string): string {
  const depth = route.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "./";
}

export function canonicalUrl(route: string, base: string): string { return new URL(route, base).href; }
