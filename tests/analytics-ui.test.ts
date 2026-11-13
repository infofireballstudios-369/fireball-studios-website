import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { analyticsPanel, analyticsPreferencesButton } from "../src/templates/analytics.ts";
import { buildPages } from "../src/templates/pages.ts";
import { pagePrefix, readBuildConfig } from "../src/lib/build-config.ts";

const documentFor = (html: string) => parseHTML(`<html><body>${html}</body></html>`).document;
const cleanText = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

test("analytics controls begin hidden as a labelled nonmodal region without loading a provider", () => {
  const document = documentFor(analyticsPanel("./"));
  const panel = document.querySelector<HTMLElement>("[data-analytics-consent]");
  assert.ok(panel);
  assert.equal(panel.tagName, "SECTION");
  assert.equal(panel.hidden, true);
  assert.equal(panel.getAttribute("tabindex"), "-1");
  assert.equal(document.querySelectorAll("dialog, [aria-modal='true'], script, iframe, img, link").length, 0);
  const heading = document.getElementById(panel.getAttribute("aria-labelledby")!);
  const description = document.getElementById(panel.getAttribute("aria-describedby")!);
  assert.equal(heading?.tagName, "H2");
  assert.equal(cleanText(heading?.textContent), "Analytics preferences");
  assert.match(cleanText(description?.textContent), /optional/i);
  for (const element of document.querySelectorAll("*")) for (const attribute of element.attributes) assert.ok(!attribute.name.startsWith("on"), "No inline event handlers");
});

test("accept and reject use identical prominence and explicit accessible labels", () => {
  const document = documentFor(analyticsPanel("./"));
  const choices = [...document.querySelectorAll<HTMLButtonElement>("[data-analytics-choice]")];
  assert.equal(choices.length, 2);
  assert.deepEqual(choices.map((button) => button.dataset.analyticsChoice), ["accept", "reject"]);
  assert.deepEqual(choices.map((button) => cleanText(button.textContent)), ["Accept analytics", "Reject analytics"]);
  assert.equal(choices[0].className, choices[1].className);
  assert.equal(choices[0].parentElement, choices[1].parentElement);
  for (const choice of choices) {
    assert.equal(choice.type, "button");
    assert.equal(choice.hidden, false);
    assert.equal(choice.hasAttribute("autofocus"), false);
    assert.equal(choice.hasAttribute("aria-pressed"), false);
  }
});

test("privacy links retain the GitHub project prefix on root and nested routes", () => {
  const base = "https://example.github.io/fireball/";
  for (const route of ["", "projects/", "blog/spaceship-concept-visualisation/"]) {
    const document = documentFor(analyticsPanel(pagePrefix(route)));
    const href = document.querySelector<HTMLAnchorElement>("a")?.getAttribute("href");
    assert.ok(href);
    assert.equal(new URL(href, new URL(route, base)).href, base + "privacy/");
  }
  for (const prefix of ['../../\"><script>alert(1)</script>', "https://evil.example/", "/"]) assert.throws(() => analyticsPanel(prefix));
});

test("saved-choice controls and footer opener expose stable, initially hidden runtime hooks", () => {
  const document = documentFor(analyticsPreferencesButton() + analyticsPanel("./"));
  const opener = document.querySelector<HTMLButtonElement>("[data-analytics-settings]");
  assert.ok(opener);
  assert.equal(opener.hidden, true);
  assert.equal(opener.type, "button");
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.ok(document.getElementById(opener.getAttribute("aria-controls")!));
  assert.equal(cleanText(opener.textContent), "Analytics preferences");
  assert.equal(document.querySelector<HTMLElement>("[data-analytics-withdraw]")?.hidden, true);
  assert.equal(document.querySelector<HTMLElement>("[data-analytics-close]")?.hidden, true);
  const status = document.querySelector("[data-analytics-status]");
  assert.equal(status?.getAttribute("role"), "status");
  assert.equal(status?.getAttribute("aria-live"), "polite");
  assert.equal(status?.getAttribute("aria-atomic"), "true");
});

function analyticsPrivacy(enabled: boolean): { text: string; links: string[] } {
  const config = readBuildConfig({ SITE_URL: "https://fireballstudios.co.uk/", NOINDEX: "false", FORM_PROVIDER: "email", ENABLE_ANALYTICS: enabled ? "true" : "false", GA_MEASUREMENT_ID: "G-7RV5GM0GCF" }, false);
  const privacy = buildPages(config).find((page) => page.route === "privacy/");
  assert.ok(privacy);
  const document = documentFor(privacy.body);
  const heading = [...document.querySelectorAll("h2")].find((element) => cleanText(element.textContent) === "Cookies and analytics");
  assert.ok(heading);
  const paragraphs: Element[] = [];
  let next = heading.nextElementSibling;
  while (next && next.tagName !== "H2") { paragraphs.push(next); next = next.nextElementSibling; }
  return { text: paragraphs.map((paragraph) => cleanText(paragraph.textContent)).join(" "), links: paragraphs.flatMap((paragraph) => [...paragraph.querySelectorAll("a")].map((anchor) => anchor.getAttribute("href")!)) };
}

test("disabled privacy wording describes inactive analytics rather than an active cookie choice", () => {
  const privacy = analyticsPrivacy(false);
  assert.match(privacy.text, /Analytics measurement is disabled/);
  assert.match(privacy.text, /do not load Google Analytics or set analytics cookies/);
  assert.doesNotMatch(privacy.text, /tag loads only after you accept/);
});

test("enabled privacy wording explains consent, retention, payload limits and withdrawal", () => {
  const privacy = analyticsPrivacy(true);
  for (const fragment of [/only after you accept/, /browser and device information/, /90 days/, /advertising consent stays denied/, /without query parameters or URL fragments/, /Form details are not sent/, /approved external origin/, /footer/, /withdraw consent/, /cannot recall data already sent/]) assert.match(privacy.text, fragment);
  assert.ok(privacy.links.includes("https://policies.google.com/privacy"));
  assert.doesNotMatch(privacy.text, /Analytics measurement is disabled/);
});
