import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { routeMetadata, pageMetadata } from "../src/lib/metadata";
import { articleTopics, canonicalUrl, getIndexableSeoPages, getSeoPage, seoPages, shouldNoIndex, siteUrl } from "../src/lib/seo";
import { blogPosts } from "../src/lib/blogData";
import { projectsData } from "../src/lib/projectsData";
import { getArticleSchema, getBreadcrumbSchema, getCreativeWorkSchema, getFAQSchema, getLocalBusinessSchema, serialiseSchema } from "../src/lib/schema";
import { PageHeader } from "../src/components/ui/PageHeader";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";

function pageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? pageFiles(join(directory, entry.name)) : entry.name === "page.tsx" ? [join(directory, entry.name)] : []);
}

test("the SEO map covers every public static page and every published project and article", () => {
  const staticRoutes = pageFiles("src/app")
    .filter((path) => !path.includes("["))
    .map((path) => "/" + relative("src/app", path).replace(/(^|\/)page\.tsx$/, ""));
  const expected = [
    ...staticRoutes,
    ...projectsData.map((project) => "/projects/" + project.slug),
    ...blogPosts.map((post) => "/blog/" + post.slug),
  ].sort();
  assert.deepEqual(Object.keys(seoPages).sort(), expected);
  assert.equal(getSeoPage("/blog/automotive-visualisation-brief"), undefined);
  for (const post of blogPosts) assert.ok(articleTopics[post.slug], "Add an intentional topic focus for " + post.slug);
  for (const page of Object.values(seoPages)) {
    assert.ok(page.primaryTopic);
    assert.ok(page.relatedQuestions.length);
    assert.ok(existsSync("public" + page.image), "Missing social image: " + page.image);
  }
});

test("each page has its own canonical, title, description and matching OG/Twitter image", () => {
  for (const page of Object.values(seoPages)) {
    const metadata = routeMetadata(page.path, {});
    assert.equal(metadata.title, page.title);
    assert.equal(metadata.description, page.description);
    assert.equal(metadata.alternates?.canonical, siteUrl + page.path);
    assert.equal(metadata.openGraph?.url, siteUrl + page.path);
    assert.equal(metadata.openGraph?.title, page.title + " | Fireball Studios");
    assert.equal(metadata.twitter?.title, metadata.openGraph?.title);
    assert.equal(metadata.twitter?.description, page.description);
    assert.equal(metadata.keywords, undefined);
    const og = metadata.openGraph?.images as { url: string; alt: string; width: number; height: number }[];
    const twitter = metadata.twitter?.images as { url: string; alt: string }[];
    assert.equal(og[0].url, siteUrl + page.image);
    assert.equal(twitter[0].url, og[0].url);
    assert.ok(og[0].alt);
    assert.ok(og[0].width > 0 && og[0].height > 0, "Register actual image dimensions for " + page.image);
  }
  const home = routeMetadata("/", {}).openGraph?.images as { width: number; height: number }[];
  assert.deepEqual([home[0].width, home[0].height], [1200, 630]);
});

test("project metadata follows the portfolio manifest and preserves editorial project titles", () => {
  for (const project of projectsData) {
    const page = getSeoPage("/projects/" + project.slug)!;
    assert.equal(page.title, project.title);
    assert.equal(page.description, project.description);
    assert.equal(page.image, project.coverImage);
  }
});

test("articles retain their real publication dates and article-specific sharing metadata", () => {
  for (const post of blogPosts) {
    const metadata = routeMetadata("/blog/" + post.slug, {});
    assert.ok(metadata.openGraph && "type" in metadata.openGraph && metadata.openGraph.type === "article");
    assert.equal(metadata.openGraph.publishedTime, post.publishDate);
    assert.deepEqual(metadata.openGraph.authors, [post.author]);
    const schema = getArticleSchema(post);
    assert.equal(schema.datePublished, post.publishDate);
    assert.equal(schema.dateModified, post.publishDate);
    assert.deepEqual(schema.mainEntityOfPage, { "@type": "WebPage", "@id": siteUrl + "/blog/" + post.slug });
  }
});

test("previews are noindex while ordinary self-hosted and production builds remain indexable", () => {
  for (const env of [{}, { NODE_ENV: "development" }, { VERCEL_ENV: "production" }, { SITE_NOINDEX: "false" }]) {
    assert.equal(shouldNoIndex(env), false);
    assert.ok(getIndexableSeoPages(env).length);
    assert.deepEqual(routeMetadata("/projects", env).robots, { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } });
  }
  for (const env of [{ VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, { SITE_NOINDEX: "true" }, { VERCEL_ENV: "production", SITE_NOINDEX: "true" }]) {
    assert.equal(shouldNoIndex(env), true);
    assert.deepEqual(getIndexableSeoPages(env), []);
    assert.deepEqual(routeMetadata("/projects/" + projectsData[0].slug, env).robots, { index: false, follow: false });
  }
});

test("canonicals use the public origin without tracking queries, fragments or trailing slashes", () => {
  assert.equal(canonicalUrl("/projects/?campaign=launch#gallery"), siteUrl + "/projects");
  assert.equal(canonicalUrl("/"), siteUrl + "/");
  for (const path of ["https://example.com/page", "//example.com/page", "/\\example.com/page"]) {
    assert.throws(() => canonicalUrl(path), RangeError);
  }
  assert.throws(() => routeMetadata("/unregistered-page"), RangeError);
  const explicit = pageMetadata("A specific title", "An accurate description.", "/projects");
  assert.equal(explicit.title, "A specific title");
  assert.equal(explicit.description, "An accurate description.");
});

test("visible breadcrumbs and JSON-LD describe the same real hierarchy", () => {
  const path = "/projects/" + projectsData[0].slug;
  const page = getSeoPage(path)!;
  const html = renderToStaticMarkup(createElement(PageHeader, {
    path, eyebrow: "Studio study", title: page.title, description: page.description, image: page.image,
  }));
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /href="\/projects"/);
  assert.match(html, /aria-current="page"/);
  const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(script);
  const schema = JSON.parse(script[1]);
  assert.deepEqual(schema, getBreadcrumbSchema(page.breadcrumbs));
  const items = schema.itemListElement as { name: string; position: number }[];
  assert.deepEqual(items.map((item) => item.name), ["Home", "Projects", projectsData[0].title]);
  assert.deepEqual(items.map((item) => item.position), [1, 2, 3]);
});

test("structured data uses visible media and verified facts without invented local or video fields", () => {
  const business = getLocalBusinessSchema();
  for (const field of ["address", "openingHours", "aggregateRating", "priceRange"]) assert.equal(field in business, false);
  for (const project of projectsData) {
    const work = getCreativeWorkSchema(project);
    assert.ok((work.image as string[]).includes(siteUrl + project.coverImage));
    if (project.video) {
      const video = work.encoding as Record<string, unknown>;
      assert.equal(video.url, project.video.watchUrl);
      assert.equal(video.embedUrl, project.video.embedUrl);
      assert.equal("contentUrl" in video, false);
      assert.equal("uploadDate" in video, false);
    } else assert.equal("encoding" in work, false);
  }
  const faq = getFAQSchema([{ question: "What can I send?", answer: "A project brief." }]);
  assert.deepEqual((faq.mainEntity as Record<string, unknown>[])[0].acceptedAnswer, { "@type": "Answer", text: "A project brief." });
  assert.doesNotMatch(serialiseSchema({ text: "</script><script>alert(1)</script>&" }), /<|&/);
});

test("sitemap and robots agree with the indexing policy and exclude obsolete or internal URLs", () => {
  const expected = getIndexableSeoPages().map((page) => canonicalUrl(page.path)).sort();
  const urls = sitemap().map((entry) => entry.url).sort();
  assert.deepEqual(urls, expected);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => !url.includes("/api/") && !url.includes("/experiences/") && !url.includes("?")));
  const rules = robots().rules;
  assert.deepEqual(rules, { userAgent: "*", allow: "/", disallow: "/api/" });
  assert.equal(robots().sitemap, shouldNoIndex() ? undefined : siteUrl + "/sitemap.xml");
});
