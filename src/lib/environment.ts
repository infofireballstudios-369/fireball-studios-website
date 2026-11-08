export type SiteEnvironment = Record<string, string | undefined>;

/** Preview pages remain crawlable so search engines can read the noindex directive. */
export function shouldNoIndex(env: SiteEnvironment = process.env): boolean {
  return env.SITE_NOINDEX === "true" || Boolean(env.VERCEL_ENV && env.VERCEL_ENV !== "production") ||
    Boolean(env.CONTEXT && env.CONTEXT !== "production");
}
