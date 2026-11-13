import assert from "node:assert/strict";
import test from "node:test";
import { readBuildConfig } from "../src/lib/build-config.ts";
import { getPageCsp } from "../src/lib/security.ts";
import { buildPages } from "../src/templates/pages.ts";

const production = { SITE_URL: "https://fireballstudios.co.uk/", NOINDEX: "false", ENABLE_ANALYTICS: "true", GA_MEASUREMENT_ID: "G-7RV5GM0GCF", FORM_PROVIDER: "email" };

test("GA4 requires explicit production eligibility rather than inheriting a public ID", () => {
  assert.equal(readBuildConfig(production, false).gaMeasurementId, "G-7RV5GM0GCF");
  for (const enable of [undefined, "", "false", "TRUE", "1"]) assert.equal(readBuildConfig({ ...production, ENABLE_ANALYTICS: enable }, false).gaMeasurementId, undefined);
  for (const noIndex of [undefined, "", "true", "FALSE"]) assert.equal(readBuildConfig({ ...production, NOINDEX: noIndex }, false).gaMeasurementId, undefined);
  assert.equal(readBuildConfig(production, true).gaMeasurementId, undefined);
  for (const siteUrl of ["http://localhost:5175/", "https://example.github.io/fireball/", "https://preview.netlify.app/", "https://fireballstudios.co.uk.attacker.test/", "https://fireballstudios.co.uk:444/"]) {
    assert.equal(readBuildConfig({ ...production, SITE_URL: siteUrl }, false).gaMeasurementId, undefined, siteUrl);
  }
  assert.equal(readBuildConfig({ ...production, SITE_URL: "https://www.fireballstudios.co.uk/" }, false).gaMeasurementId, production.GA_MEASUREMENT_ID);
});

test("invalid enabled public stream configuration fails the build rather than collecting elsewhere", () => {
  for (const id of [undefined, "", "UA-1234-1", "G-7rv5gm0gcf", "G-12345", "G-7RV5GM0GCF?x=1", "G-7RV5GM0GCF\n"]) assert.throws(() => readBuildConfig({ ...production, GA_MEASUREMENT_ID: id }, false), /GA_MEASUREMENT_ID/);
  // Inactive previews do not need a production stream or Google permissions.
  assert.equal(readBuildConfig({ ...production, NOINDEX: "true", GA_MEASUREMENT_ID: undefined }, false).gaMeasurementId, undefined);
});

function directive(csp: string, name: string): string[] {
  return csp.split("; ").find((entry) => entry.startsWith(name + " "))?.split(" ").slice(1) ?? [];
}

test("Google collection permissions are scoped to explicitly eligible pages without enabling Ads or frames", () => {
  const config = readBuildConfig(production, false);
  const csp = getPageCsp(config, "", true);
  assert.deepEqual(directive(csp, "script-src"), ["'self'", "https://www.googletagmanager.com"]);
  assert.deepEqual(directive(csp, "connect-src"), ["'self'", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.google.com"]);
  assert.deepEqual(directive(csp, "frame-src"), ["'self'", "https://player.vimeo.com"]);
  assert.deepEqual(directive(csp, "object-src"), ["'none'"]);
  assert.doesNotMatch(csp, /unsafe-eval|doubleclick|googlesyndication|googleadservices/);
  for (const excluded of [getPageCsp(config, ""), getPageCsp(config, "404.html", false), getPageCsp(readBuildConfig({ ...production, ENABLE_ANALYTICS: "false" }, false), "", true)]) assert.doesNotMatch(excluded, /google/);
  const contact = getPageCsp(readBuildConfig({ ...production, FORM_PROVIDER: "netlify", NETLIFY_FORM_URL: "https://fireball-studios-enquiries.netlify.app/" }, false), "contact/", true);
  assert.ok(directive(contact, "frame-src").includes("https://fireball-studios-enquiries.netlify.app"));
  assert.ok(!directive(contact, "connect-src").includes("https://fireball-studios-enquiries.netlify.app"), "The parent cannot read or send enquiry contents");
});

test("the production page allowlist contains 18 real routes and excludes redirects and errors", () => {
  const pages = buildPages(readBuildConfig(production, false));
  const allowed = pages.filter((page) => !page.noIndex && !page.redirect);
  assert.equal(allowed.length, 18);
  assert.ok(allowed.some((page) => page.route === "projects/interactive-residence/"));
  assert.ok(allowed.some((page) => page.route === "blog/spaceship-concept-visualisation/"));
  assert.ok(!allowed.some((page) => page.file || page.redirect || /automotive-visualisation/.test(page.route)));
});
