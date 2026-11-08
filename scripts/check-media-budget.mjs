import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { getEmbeddedModel, readModelMetadata } from "./configurator-models.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const mediaLimits = Object.freeze({ atlasBytes: 850_000, atlasRequests: 12, viewerGzipBytes: 2_600_000 });
export const creditRates = Object.freeze({ monthlyLimit: 300, bandwidthPerGb: 20, requestsPerTenThousand: 2, productionDeploy: 15, computePerGbHour: 10 });
export const planningDefaults = Object.freeze({
  visits: 5_000, mbPerVisit: 1.5, requestsPerVisit: 50, productionDeploys: 1,
  viewerLaunches: 0, viewerMbPerLaunch: 2.5, viewerRequestsPerLaunch: 5,
  computeGbHours: 0, extraGb: 0, extraRequests: 0,
});

/** Planning arithmetic uses decimal MB/GB and counts visits, not unique people. */
export function forecastCredits(overrides = {}) {
  const assumptions = { ...planningDefaults, ...overrides };
  const integers = new Set(["visits", "requestsPerVisit", "productionDeploys", "viewerLaunches", "viewerRequestsPerLaunch", "extraRequests"]);
  for (const [key, value] of Object.entries(assumptions)) {
    if (!Number.isFinite(value) || value < 0 || (integers.has(key) && !Number.isInteger(value))) {
      throw new RangeError(`${key} must be a non-negative ${integers.has(key) ? "integer" : "finite number"}.`);
    }
  }
  const bandwidthGb = (assumptions.visits * assumptions.mbPerVisit + assumptions.viewerLaunches * assumptions.viewerMbPerLaunch) / 1_000 + assumptions.extraGb;
  const requests = assumptions.visits * assumptions.requestsPerVisit + assumptions.viewerLaunches * assumptions.viewerRequestsPerLaunch + assumptions.extraRequests;
  const credits = {
    bandwidth: bandwidthGb * creditRates.bandwidthPerGb,
    requests: requests / 10_000 * creditRates.requestsPerTenThousand,
    productionDeploys: assumptions.productionDeploys * creditRates.productionDeploy,
    compute: assumptions.computeGbHours * creditRates.computePerGbHour,
  };
  const totalCredits = Object.values(credits).reduce((total, value) => total + value, 0);
  return { assumptions, bandwidthGb, requests, credits, totalCredits,
    remainingCredits: creditRates.monthlyLimit - totalCredits,
    withinFreeLimit: totalCredits <= creditRates.monthlyLimit };
}

/** Measure only referenced delivery assets; original source sequences remain untouched. */
export async function measureMedia(projectRoot = root) {
  const generated = await readFile(join(projectRoot, "src/lib/generated/budgetSequences.ts"), "utf8");
  // The generator emits a JSON object followed by `as const`; read data without executing TypeScript.
  const literal = generated.match(/export const generatedBudgetSequences = (\{[\s\S]*\}) as const;/)?.[1];
  if (!literal) throw new Error("The generated atlas manifest format changed; update the budget reader.");
  const sequences = JSON.parse(literal);
  let atlasBytes = 0;
  const atlasPaths = new Set();
  for (const [id, sequence] of Object.entries(sequences)) {
    let sequenceBytes = 0;
    for (const url of sequence.atlasPaths) {
      if (!url.startsWith(`/atlases/${id}/`) || atlasPaths.has(url)) throw new Error(`Invalid or duplicated atlas reference: ${url}`);
      const bytes = await readFile(join(projectRoot, "public", url));
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
      if (!url.endsWith(`.${hash}.webp`)) throw new Error(`Atlas content does not match its immutable filename: ${url}`);
      atlasPaths.add(url);
      sequenceBytes += bytes.length;
    }
    if (sequenceBytes !== sequence.encodedBytes) throw new Error(`Regenerate the atlas manifest: sequence ${id} has stale byte counts.`);
    atlasBytes += sequenceBytes;
  }
  const viewerPath = "public/experiences/car/fireball-car-configurator2.html";
  const viewer = await readFile(join(projectRoot, viewerPath));
  const html = viewer.toString("utf8");
  // Fail if model delivery changes: external model files must be added to this budget first.
  const embeddedModels = ["vehicle", "rim"].map((id) => {
    const bytes = getEmbeddedModel(html, id);
    const metadata = readModelMetadata(bytes);
    return { id, decodedContainerBytes: bytes.length, meshes: metadata.meshes.length,
      requiredExtensions: metadata.extensionsRequired ?? [] };
  });
  return { atlasBytes, atlasRequests: atlasPaths.size, viewerPath, viewerRawBytes: viewer.length,
    viewerGzipBytes: gzipSync(viewer, { level: 6 }).length, embeddedModels };
}

export function getBudgetFailures(media) {
  const failures = [];
  for (const [key, limit] of Object.entries(mediaLimits)) {
    if (!Number.isFinite(media[key]) || media[key] > limit) failures.push(`${key}: ${media[key]} exceeds the ${limit} limit.`);
  }
  return failures;
}

async function main() {
  const names = {
    visits: "visits", "mb-per-visit": "mbPerVisit", "requests-per-visit": "requestsPerVisit",
    deploys: "productionDeploys", launches: "viewerLaunches", "viewer-mb": "viewerMbPerLaunch",
    "viewer-requests": "viewerRequestsPerLaunch", "compute-gbh": "computeGbHours",
    "extra-gb": "extraGb", "extra-requests": "extraRequests",
  };
  const { values } = parseArgs({ options: {
    ...Object.fromEntries(Object.keys(names).map((name) => [name, { type: "string" }])),
    json: { type: "boolean" }, help: { type: "boolean" }, "enforce-forecast": { type: "boolean" },
  } });
  if (values.help) {
    console.log("Usage: node scripts/check-media-budget.mjs [--visits=5000] [--launches=250] [--compute-gbh=0.5] [--enforce-forecast] [--json]");
    console.log("Other numeric options: --mb-per-visit --requests-per-visit --deploys --viewer-mb --viewer-requests --extra-gb --extra-requests");
    console.log("Asset limits always fail the check. --enforce-forecast also fails when the selected scenario exceeds 300 credits.");
    return;
  }
  const overrides = Object.fromEntries(Object.entries(names).filter(([name]) => values[name] !== undefined)
    .map(([name, key]) => [key, Number(values[name])]));
  forecastCredits(overrides);
  const media = await measureMedia();
  // Never silently forecast a smaller viewer transfer than the measured gzip payload.
  overrides.viewerMbPerLaunch = Math.max(overrides.viewerMbPerLaunch ?? planningDefaults.viewerMbPerLaunch, media.viewerGzipBytes / 1_000_000);
  const selected = forecastCredits(overrides);
  const forecasts = [...new Set([0, 250, 5_000, selected.assumptions.viewerLaunches])]
    .map((viewerLaunches) => forecastCredits({ ...selected.assumptions, viewerLaunches }));
  const failures = getBudgetFailures(media);
  if (values["enforce-forecast"] && !selected.withinFreeLimit) failures.push(`Selected forecast uses ${selected.totalCredits.toFixed(2)} of 300 credits.`);
  const report = { ratesChecked: "2026-11-08", creditRates, mediaLimits, media, selected, forecasts, failures,
    assumptions: [
      "1.5 MB and 50 Netlify requests per complete homepage visit are planning allowances, not a browser measurement.",
      "A 3D launch allows 2.5 MB and five extra Netlify requests: one viewer HTML request plus four for navigation/UI. External CDN requests are not included.",
      "Embedded vehicle and rim data are already included in viewerGzipBytes; do not add their decoded sizes to transfer totals.",
      "Compute defaults to zero until explicitly supplied; this does not mean the deployed app uses no compute.",
      "Other pages, repeat visits, bots, preview traffic and additional team projects require extra bandwidth/request allowances.",
      "Local gzip-6 is a transfer estimate. Verify Content-Encoding and transferred bytes after deployment.",
    ] };
  if (values.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Home atlases: ${media.atlasBytes.toLocaleString("en-GB")} / ${mediaLimits.atlasBytes.toLocaleString("en-GB")} bytes; ${media.atlasRequests} requests.`);
    console.log(`3D viewer: ${media.viewerGzipBytes.toLocaleString("en-GB")} / ${mediaLimits.viewerGzipBytes.toLocaleString("en-GB")} gzip-6 bytes (${media.viewerRawBytes.toLocaleString("en-GB")} raw). Both models are included.`);
    console.log(`Forecast: ${selected.assumptions.visits} visits × ${selected.assumptions.mbPerVisit} MB / ${selected.assumptions.requestsPerVisit} requests; ${selected.assumptions.productionDeploys} production deploy(s); ${selected.assumptions.computeGbHours} compute GB-hours.`);
    for (const forecast of forecasts) console.log(`  ${forecast.assumptions.viewerLaunches} 3D launches: ${forecast.totalCredits.toFixed(2)} credits; ${forecast.withinFreeLimit ? forecast.remainingCredits.toFixed(2) + " remaining" : (-forecast.remainingCredits).toFixed(2) + " OVER LIMIT"}.`);
    console.log("Formula: 20 × GB + 2 × requests / 10,000 + 15 × production deploys + 10 × compute GB-hours.");
    console.log("These are visit assumptions, not an availability guarantee. See docs/BUDGET_AND_USAGE.md for exclusions and monitoring.");
    if (!failures.length) console.log("Media budget checks passed.");
  }
  if (failures.length) {
    if (!values.json) failures.forEach((failure) => console.error(failure));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
