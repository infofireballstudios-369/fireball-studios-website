import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { legacyRoutes, getLegacyRoute } from "../src/data/legacyRoutes.ts";
import { buildPages } from "../src/templates/pages.ts";
import { readBuildConfig } from "../src/lib/build-config.ts";

const expected = {
  "about.html": "about/", "contact.html": "contact/", "industries.html": "industries/",
  "projects.html": "projects/", "services.html": "industries/", "visualisation.html": "industries/",
  "process.html": "about/#process", "privacy.html": "privacy/", "terms.html": "terms/",
  "fireball-car-configurator2.html": "projects/car-configurator/", "courtyard-house5.html": "projects/",
  "glass-sculpture-11-selected.html": "projects/",
};

test("the legacy allowlist preserves useful old addresses without redirecting retired technical services", () => {
  assert.deepEqual(Object.fromEntries(legacyRoutes.map((entry) => [entry.file, entry.target])), expected);
  for (const file of ["mechanical-design.html", "cad-modelling.html", "cfd-analysis.html", "fea-analysis.html", "prototyping.html", "../contact.html", "/contact.html", "other.html", "contact.html?x=1"]) assert.equal(getLegacyRoute(file), undefined, file);
  assert.equal(new Set(legacyRoutes.map((entry) => entry.file)).size, legacyRoutes.length);
});

test("legacy redirects are non-indexable real root documents with portable links and real destinations", () => {
  for (const siteUrl of ["https://fireballstudios.co.uk/", "https://example.github.io/fireball-static/"]) {
    const pages = buildPages(readBuildConfig({ SITE_URL: siteUrl, NOINDEX: "false" }, false));
    assert.equal(pages.filter((page) => !page.noIndex).length, 18);
    for (const legacy of legacyRoutes) {
      const page = pages.find((entry) => entry.file === legacy.file)!;
      assert.ok(page, legacy.file);
      assert.equal(page.route, legacy.file);
      assert.equal(page.noIndex, true);
      assert.equal(page.redirect, "./" + legacy.target);
      assert.equal(page.seoTitle, undefined, "redirects do not need keyword-targeted editorial pages");
      const target = new URL(page.redirect!, new URL(legacy.file, siteUrl));
      assert.ok(target.href.startsWith(siteUrl));
      const route = target.pathname.slice(new URL(siteUrl).pathname.length);
      const destination = pages.find((entry) => entry.route === route)!;
      assert.ok(destination && !destination.noIndex && !destination.redirect, legacy.file);
      const document = parseHTML(page.body).document;
      assert.equal(document.querySelector("h1")?.textContent, legacy.title);
      assert.equal(new URL(document.querySelector("a")!.getAttribute("href")!, new URL(legacy.file, siteUrl)).href, target.href);
      if (target.hash) assert.ok(parseHTML(destination.body).document.getElementById(target.hash.slice(1)), legacy.file);
    }
  }
});
