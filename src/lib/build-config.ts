export interface BuildConfig { siteUrl: string; noIndex: boolean; development: boolean }

export function readBuildConfig(env: Record<string, string | undefined> = process.env, development = process.argv.includes("--dev")): BuildConfig {
  const value = env.SITE_URL || "https://fireballstudios.co.uk/";
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("SITE_URL must be a plain absolute HTTP(S) website URL.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Public SITE_URL must use HTTPS.");
  return { siteUrl: url.href.replace(/\/?$/, "/"), noIndex: development || env.NOINDEX !== "false", development };
}

export function pagePrefix(route: string): string {
  const depth = route.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "./";
}

export function canonicalUrl(route: string, base: string): string { return new URL(route, base).href; }
