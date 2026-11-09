import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { seoPages, getPageSeo, industryTopics } from "../src/data/seo.ts";
import { projects } from "../src/data/projects.ts";
import { blogPosts } from "../src/data/blog.ts";
import { faqs, industries } from "../src/data/content.ts";
import { buildPages } from "../src/templates/pages.ts";
import { readBuildConfig, canonicalUrl } from "../src/lib/build-config.ts";
import { getBusinessSchema } from "../src/lib/schema.ts";
import { legacyRoutes, getLegacyRoute } from "../src/data/legacyRoutes.ts";

const siteUrl = "https://example.test/fireball-static/";
const pages = buildPages(readBuildConfig({ SITE_URL: siteUrl, NOINDEX: "false" }, false));
const page = (route: string) => {
  const found = pages.find((entry) => entry.route === route);
  assert.ok(found, `Missing route: ${route}`);
  return found;
};
const documentFor = (route: string) => parseHTML(`<html><body>${page(route).body}</body></html>`).document;
const text = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

test("every editorial route has intentional topic metadata while legacy redirects stay outside the keyword map", () => {
  assert.equal(pages.length, 20 + legacyRoutes.length);
  assert.equal(seoPages.length, 20);
  const editorialPages = pages.filter((entry) => !getLegacyRoute(entry.route));
  assert.deepEqual(new Set(seoPages.map((entry) => entry.route)), new Set(editorialPages.map((entry) => entry.route)));
  assert.equal(new Set(seoPages.map((entry) => entry.title)).size, seoPages.length);
  assert.equal(new Set(seoPages.map((entry) => entry.description)).size, seoPages.length);
  for (const entry of editorialPages) {
    const seo = getPageSeo(entry.route);
    assert.equal(entry.seoTitle, seo.title);
    assert.equal(entry.seoDescription, seo.description);
    assert.ok(seo.primaryTopic.trim());
    assert.ok(seo.description.length > 70 && seo.description.length < 220, entry.route);
    assert.doesNotMatch(seo.title + " " + seo.description, /guaranteed.*rank|number.one.*google|masters.level|engineering precision/i);
  }
  assert.throws(() => getPageSeo("unregistered/"), /No SEO metadata/);
});

test("search descriptions do not rename editorial headings or breadcrumb identities", () => {
  assert.equal(text(documentFor("").querySelector("h1")?.textContent), "Photorealistic 3D Visualisation That Brings Your Ideas to Life");
  for (const entry of [...projects.map((value) => ({ ...value, route: "projects/" + value.slug + "/" })), ...blogPosts.map((value) => ({ ...value, route: "blog/" + value.slug + "/" }))]) {
    const current = page(entry.route);
    assert.equal(current.title, entry.title);
    assert.equal(text(documentFor(entry.route).querySelector("h1")?.textContent), entry.title);
    const breadcrumb = current.schemas?.find((schema) => schema["@type"] === "BreadcrumbList");
    assert.ok(breadcrumb);
    const items = breadcrumb.itemListElement as { name: string; item: string }[];
    assert.equal(items.at(-1)?.name, entry.title);
    assert.equal(items.at(-1)?.item, canonicalUrl(entry.route, siteUrl));
  }
});

test("topic links resolve to real pages and real anchors under a repository URL", () => {
  const links = [...seoPages.flatMap((entry) => entry.relatedLinks), ...Object.values(industryTopics).map((entry) => entry.guide)];
  for (const entry of links) {
    assert.ok(!entry.route.startsWith("/"), entry.route);
    const target = new URL(entry.route, siteUrl);
    assert.ok(target.href.startsWith(siteUrl), entry.route);
    const route = target.pathname.slice(new URL(siteUrl).pathname.length);
    const destination = page(route);
    assert.ok(!destination.noIndex && !destination.redirect, entry.route);
    if (target.hash) assert.ok(documentFor(route).getElementById(target.hash.slice(1)), entry.route);
  }
});

test("article answers and contextual links are present in static HTML", () => {
  for (const post of blogPosts) {
    const route = "blog/" + post.slug + "/";
    const seo = getPageSeo(route);
    const document = documentFor(route);
    assert.equal(text(document.querySelector(".article-summary p")?.textContent), seo.directAnswer);
    const links = [...document.querySelectorAll(".article-next-steps a")];
    assert.deepEqual(links.map((entry) => new URL(entry.getAttribute("href")!, canonicalUrl(route, siteUrl)).href), seo.relatedLinks.map((entry) => new URL(entry.route, siteUrl).href));
    assert.ok(!page(route).schemas?.some((schema) => schema["@type"] === "FAQPage"), "Editorial questions must not generate hidden FAQs");
  }
  for (const project of projects) {
    const route = "projects/" + project.slug + "/";
    const links = [...documentFor(route).querySelectorAll(".project-next-steps a")];
    assert.deepEqual(links.map((entry) => text(entry.textContent).replace(/\s*→$/, "")), getPageSeo(route).relatedLinks.map((entry) => entry.label));
  }
});

test("industry question headings introduce existing visible answers and useful guides", () => {
  const document = documentFor("industries/");
  for (const industry of industries) {
    const row = document.getElementById(industry.id);
    assert.ok(row);
    assert.equal(text(row.querySelector(".industry-copy h3")?.textContent), industryTopics[industry.id].questions[0]);
    assert.ok(text(row.textContent).includes(industry.description));
    const guide = row.querySelector(".small-note a");
    assert.ok(guide);
    assert.equal(new URL(guide.getAttribute("href")!, siteUrl + "industries/").href, new URL(industryTopics[industry.id].guide.route, siteUrl).href);
  }
});

test("business schema describes the configured website without inventing a search endpoint or studio address", () => {
  const schema = getBusinessSchema(siteUrl);
  const website = schema.find((entry) => entry["@type"] === "WebSite");
  assert.ok(website);
  assert.equal(website.url, siteUrl);
  assert.equal(website["@id"], siteUrl + "#website");
  assert.deepEqual(website.publisher, { "@id": siteUrl + "#organisation" });
  assert.equal(website.potentialAction, undefined);
  for (const entry of schema) for (const unsupported of ["address", "aggregateRating", "award", "review", "foundingDate"]) assert.equal(entry[unsupported], undefined);
  const faq = page("").schemas?.find((entry) => entry["@type"] === "FAQPage");
  assert.ok(faq);
  const answers = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
  assert.deepEqual(answers.map((entry) => ({ question: entry.name, answer: entry.acceptedAnswer.text })), faqs);
});
