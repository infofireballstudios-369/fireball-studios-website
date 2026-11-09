import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { buildPages } from "../src/templates/pages.ts";
import { navbar, footer } from "../src/templates/ui.ts";
import { canonicalUrl, pagePrefix, readBuildConfig } from "../src/lib/build-config.ts";
import { getBusinessSchema, serialiseSchema } from "../src/lib/schema.ts";
import { projects, featuredProjects } from "../src/data/projects.ts";
import { blogPosts } from "../src/data/blog.ts";
import { industries, process, faqs } from "../src/data/content.ts";

const siteUrl = "https://fireballstudios.github.io/fireball-static/";
const config = readBuildConfig({ SITE_URL: siteUrl, NOINDEX: "false" }, false);
const pages = buildPages(config);
const primary = pages.filter((page) => !page.noIndex && !page.redirect);
const getPage = (route: string) => {
  const page = pages.find((entry) => entry.route === route);
  assert.ok(page, `Missing page: ${route}`);
  return page;
};
const bodyDocument = (route: string) => parseHTML(`<html><body>${getPage(route).body}</body></html>`).document;
const text = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

test("preview builds default to noindex and only an explicit production setting enables indexing", () => {
  assert.equal(readBuildConfig({}, false).noIndex, true);
  assert.equal(readBuildConfig({ NOINDEX: "true" }, false).noIndex, true);
  assert.equal(readBuildConfig({ NOINDEX: "false" }, false).noIndex, false);
  assert.equal(readBuildConfig({ NOINDEX: "false" }, true).noIndex, true);
  assert.equal(readBuildConfig({ SITE_URL: "https://example.com/repository", NOINDEX: "false" }, false).siteUrl, "https://example.com/repository/");
});

test("public canonical settings require HTTPS and reject credentials or URL suffixes", () => {
  for (const url of ["http://public.example/", "//example.com/", "ftp://example.com/", "https://user:secret@example.com/", "https://example.com/?preview=1", "https://example.com/#preview", "not a URL"]) {
    assert.throws(() => readBuildConfig({ SITE_URL: url }, false), Error, url);
  }
  for (const url of ["http://localhost:5175/", "http://127.0.0.1:5175/", "http://[::1]:5175/"]) assert.equal(readBuildConfig({ SITE_URL: url }, true).siteUrl, url);
});

test("the build contains 18 primary pages and two non-indexed fallback documents without collisions", () => {
  assert.equal(pages.length, 20);
  assert.equal(primary.length, 18);
  assert.equal(new Set(pages.map((page) => page.route)).size, pages.length);
  assert.equal(new Set(pages.map((page) => page.file ?? `${page.route}index.html`)).size, pages.length);
  for (const route of ["", "projects/", "industries/", "about/", "blog/", "contact/", "privacy/", "terms/"]) assert.ok(primary.some((page) => page.route === route));
  assert.equal(getPage("404").file, "404.html");
  assert.equal(getPage("404").noIndex, true);
  const moved = getPage("blog/automotive-visualisation-brief/");
  assert.equal(moved.noIndex, true);
  assert.equal(new URL(moved.redirect!, canonicalUrl(moved.route, siteUrl)).href, siteUrl + "blog/spaceship-concept-visualisation/");
});

test("every document has one meaningful semantic heading and unique descriptive metadata", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const page of pages) {
    const document = bodyDocument(page.route);
    assert.equal(document.querySelectorAll("h1").length, 1, page.route);
    assert.ok(text(document.querySelector("h1")?.textContent).length > 10, page.route);
    assert.ok(page.title.length > 8 && page.title.length < 100, page.route);
    assert.ok(page.description.length > 30 && page.description.length < 280, page.route);
    assert.ok(!page.image.startsWith("/") && !page.image.includes(".."), page.route);
    assert.equal(document.querySelectorAll("iframe, video").length, 0, `${page.route}: active media must be deferred`);
    for (const element of document.querySelectorAll("*")) for (const attribute of element.attributes) assert.ok(!attribute.name.startsWith("on"), `${page.route}: inline event handler`);
    assert.ok(!titles.has(page.title), `Duplicate title: ${page.title}`);
    assert.ok(!descriptions.has(page.description), `Duplicate description: ${page.description}`);
    titles.add(page.title);
    descriptions.add(page.description);
  }
  assert.match(text(bodyDocument("").querySelector("h1")?.textContent), /Photorealistic 3D Visualisation.*Ideas to Life/);
});

test("project and article detail metadata describes the corresponding manifest entry", () => {
  assert.equal(projects.length, 6);
  assert.equal(blogPosts.length, 4);
  for (const project of projects) {
    const page = getPage(`projects/${project.slug}/`);
    assert.equal(page.title, project.title);
    assert.equal(page.description, project.description);
    assert.equal(page.image, project.cover);
    assert.equal(text(bodyDocument(page.route).querySelector("h1")?.textContent), project.title);
  }
  for (const post of blogPosts) {
    const page = getPage(`blog/${post.slug}/`);
    assert.equal(page.title, post.title);
    assert.equal(page.description, post.excerpt);
    assert.equal(page.image, post.image);
    assert.equal(text(bodyDocument(page.route).querySelector("h1")?.textContent), post.title);
  }
});

test("root, hub and nested routes retain their GitHub project prefix in relative navigation", () => {
  assert.equal(pagePrefix(""), "./");
  assert.equal(pagePrefix("/"), "./");
  assert.equal(pagePrefix("projects/"), "../");
  assert.equal(pagePrefix("projects/car-configurator/"), "../../");
  assert.equal(canonicalUrl("projects/car-configurator/", siteUrl), siteUrl + "projects/car-configurator/");
  const validRoutes = new Set(pages.map((page) => canonicalUrl(page.route, siteUrl)));
  validRoutes.add(siteUrl + "experiences/car/fireball-car-configurator2.html");
  for (const page of primary) {
    const prefix = pagePrefix(page.route);
    const currentUrl = canonicalUrl(page.route, siteUrl);
    const document = parseHTML(`<html><body>${navbar(prefix, page.route)}<main>${page.body}</main>${footer(prefix)}</body></html>`).document;
    for (const anchor of document.querySelectorAll("a[href]")) {
      const target = new URL(anchor.getAttribute("href")!, currentUrl);
      if (target.origin !== new URL(siteUrl).origin) continue;
      assert.ok(target.pathname.startsWith("/fireball-static/"), `${page.route}: escaped repository prefix: ${target.href}`);
      const hash = target.hash;
      target.hash = "";
      assert.ok(validRoutes.has(target.href), `${page.route}: unknown internal route: ${target.href}`);
      if (hash && target.href === currentUrl) assert.ok(document.getElementById(decodeURIComponent(hash.slice(1))), `${page.route}: missing anchor ${hash}`);
    }
  }
});

test("portfolio source IDs preserve industry mapping and stay distinct from presentation IDs", () => {
  const ids = (category: string) => projects.filter((project) => project.category === category).map((project) => project.sourceId).sort();
  assert.deepEqual(ids("Real Estate"), [1, 3, 4]);
  assert.deepEqual(ids("Architecture"), [2]);
  assert.deepEqual(ids("Furniture / Product"), [5]);
  assert.equal(projects.find((project) => project.id === "03")?.sourceId, 5);
  const automotive = projects.filter((project) => project.category === "Automotive");
  assert.equal(automotive.length, 1);
  assert.equal(automotive[0].slug, "car-configurator");
  assert.equal(automotive[0].interactive, true);
  assert.equal(automotive[0].videoId, undefined);
  assert.equal(projects.some((project) => Number(project.sourceId) === 6), false);
  const cards = bodyDocument("projects/").querySelectorAll("[data-project-category]");
  assert.equal(cards.length, 6);
});

test("industry links point to the correct existing studies rather than the spaceship concept", () => {
  const expected: Record<string, string[]> = {
    "real-estate": ["garden-residence", "interactive-residence", "bedroom-retreat"],
    architecture: ["living-in-light"], automotive: ["car-configurator"], products: ["lounge-chair-study"],
  };
  const document = bodyDocument("industries/");
  assert.equal(industries.length, 4);
  for (const industry of industries) {
    assert.deepEqual(industry.projectSlugs, expected[industry.id]);
    const links = [...document.querySelectorAll(`#${industry.id} .related-links a`)];
    assert.equal(links.length, expected[industry.id].length);
    const routes = links.map((anchor) => new URL(anchor.getAttribute("href")!, siteUrl + "industries/").href);
    assert.deepEqual(routes, expected[industry.id].map((slug) => siteUrl + `projects/${slug}/`));
    assert.ok(industry.projectSlugs.every((slug) => projects.some((project) => project.slug === slug)));
  }
});

test("home features source projects 3 and 5 while its middle chapter and concept article use source 6", () => {
  assert.deepEqual(featuredProjects.map((project) => project.sourceId), [3, 5]);
  const home = bodyDocument("");
  assert.deepEqual([...home.querySelectorAll("[data-story-chapter]")].map((chapter) => Number(chapter.getAttribute("data-sequence"))), [3, 6, 5]);
  const featuredLinks = [...home.querySelectorAll("#selected-work .project-image-link")].map((anchor) => new URL(anchor.getAttribute("href")!, siteUrl).href);
  assert.deepEqual(featuredLinks, featuredProjects.map((project) => siteUrl + `projects/${project.slug}/`));
  const concept = blogPosts.filter((post) => post.sourceId === 6);
  assert.equal(concept.length, 1);
  assert.equal(concept[0].category, "Studio concepts");
  assert.equal(concept[0].videoId, "1243948923");
  const article = bodyDocument(`blog/${concept[0].slug}/`);
  assert.match(text(article.querySelector("figcaption")?.textContent), /original studio concept.*Not a production vehicle or commissioned client project/);
  assert.equal(article.querySelector("[data-video-trigger]")?.getAttribute("data-video-id"), "1243948923");
});

test("about presents all six review stages in the agreed order", () => {
  const expected = ["Understand", "Design & Model", "Design Review", "Visualise", "Review & Refine", "Deliver"];
  assert.deepEqual(process.map((step) => step.title), expected);
  const document = bodyDocument("about/");
  assert.deepEqual([...document.querySelectorAll("#process ol h3")].map((heading) => text(heading.textContent)), expected);
  assert.equal(document.querySelectorAll("#process ol > li").length, 6);
  assert.doesNotMatch(text(document.body.textContent), /five[- ](?:step|stage)/i);
});

test("contact exposes four labelled fields and describes an email draft instead of delivery", () => {
  const document = bodyDocument("contact/");
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  assert.ok(form);
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select")];
  assert.deepEqual(fields.map((field) => field.name), ["name", "phone", "email", "message"]);
  for (const field of fields) {
    assert.ok(form.querySelector(`label[for="${field.id}"]`));
    assert.ok(form.querySelector(`[data-error-for="${field.name}"]`));
  }
  assert.equal(form.getAttribute("action"), "mailto:info@fireballstudios.co.uk");
  assert.match(text(form.querySelector(".form-help")?.textContent), /email draft.*send it in your email app.*does not submit or store/);
  assert.ok(form.querySelector("[data-email-draft]"));
  assert.ok(form.querySelector("[data-copy-brief]"));
});

test("structured data preserves canonical subpaths and describes only supported studio and video facts", () => {
  const forbidden = new Set(["aggregateRating", "review", "award", "awards", "alumniOf", "hasCredential", "numberOfEmployees", "foundingDate", "priceRange", "streetAddress", "client", "duration", "uploadDate", "contentUrl"]);
  const inspect = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(inspect); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) { assert.ok(!forbidden.has(key), `Unverified structured-data field: ${key}`); inspect(child); }
  };
  for (const schema of [...getBusinessSchema(siteUrl), ...pages.flatMap((page) => page.schemas ?? [])]) inspect(schema);
  for (const project of projects) {
    const route = `projects/${project.slug}/`;
    const schema = getPage(route).schemas?.find((entry) => entry["@type"] === "CreativeWork");
    assert.ok(schema);
    assert.equal(schema.url, canonicalUrl(route, siteUrl));
    assert.ok((schema.image as string[]).every((url) => url.startsWith(siteUrl + "images/")));
    if (project.videoId) {
      const video = schema.encoding as Record<string, unknown>;
      assert.equal(video.embedUrl, "https://player.vimeo.com/video/" + project.videoId);
      assert.equal(video.url, "https://vimeo.com/" + project.videoId);
      assert.ok(String(video.thumbnailUrl).startsWith(siteUrl));
    } else assert.equal(schema.encoding, undefined);
  }
  const faq = getPage("").schemas?.find((entry) => entry["@type"] === "FAQPage");
  assert.ok(faq);
  assert.deepEqual((faq.mainEntity as { name: string }[]).map((entry) => entry.name), faqs.map((entry) => entry.question));
});

test("JSON-LD escaping prevents a supplied string from closing its script element", () => {
  const payload = { name: "</script><script>alert('injected')</script>", description: "Colour & light < detail", unicode: "A line\u2028and another\u2029line" };
  const serialised = serialiseSchema(payload);
  assert.ok(!serialised.includes("<"));
  assert.ok(!serialised.includes("&"));
  assert.deepEqual(JSON.parse(serialised), payload);
  const { document } = parseHTML(`<html><body><script type="application/ld+json">${serialised}</script><p id="safe">Still in the document</p></body></html>`);
  assert.equal(document.querySelectorAll("script").length, 1);
  assert.deepEqual(JSON.parse(document.querySelector("script")!.textContent!), payload);
  assert.equal(document.getElementById("safe")?.textContent, "Still in the document");
});
