export const analyticsHosts = ["fireballstudios.co.uk", "www.fireballstudios.co.uk"] as const;

export function isMeasurementId(value: unknown): value is string {
  return typeof value === "string" && /^G-[A-Z0-9]{6,20}$/.test(value);
}

/** Public settings never enable collection on a local, preview or non-indexable build. */
export function getAnalyticsMeasurementId(env: Record<string, string | undefined>, context: { siteUrl: string; noIndex: boolean; development: boolean }): string | undefined {
  if (env.ENABLE_ANALYTICS !== "true" || context.development || context.noIndex) return;
  const url = new URL(context.siteUrl);
  if (url.protocol !== "https:" || url.port || !analyticsHosts.includes(url.hostname as typeof analyticsHosts[number])) return;
  if (!isMeasurementId(env.GA_MEASUREMENT_ID)) throw new Error("Enabled analytics requires a valid public GA_MEASUREMENT_ID beginning G-.");
  return env.GA_MEASUREMENT_ID;
}
