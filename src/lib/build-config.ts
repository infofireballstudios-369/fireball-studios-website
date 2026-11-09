import { getFormEndpoint } from "./form-endpoint";

export interface BuildConfig { siteUrl: string; noIndex: boolean; development: boolean; formEndpoint?: string; formProvider?: "formsubmit" | "formspree" | "email" }

export function readBuildConfig(env: Record<string, string | undefined> = process.env, development = process.argv.includes("--dev")): BuildConfig {
  const value = env.SITE_URL || "https://fireballstudios.co.uk/";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("SITE_URL must be a plain absolute HTTP(S) website URL.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Public SITE_URL must use HTTPS.");
  const formEndpoint = getFormEndpoint(env.FORMSPREE_ENDPOINT);
  const formProvider = env.FORM_PROVIDER || (formEndpoint ? "formspree" : "formsubmit");
  if (!["formsubmit", "formspree", "email"].includes(formProvider)) throw new Error("FORM_PROVIDER must be formsubmit, formspree or email.");
  if (formProvider === "formspree" && !formEndpoint) throw new Error("Formspree requires a verified public FORMSPREE_ENDPOINT.");
  return { siteUrl: url.href.replace(/\/?$/, "/"), noIndex: development || env.NOINDEX !== "false", development, formEndpoint, formProvider: formProvider as BuildConfig["formProvider"] };
}

export function pagePrefix(route: string): string {
  const depth = route.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "./";
}

export function canonicalUrl(route: string, base: string): string { return new URL(route, base).href; }
