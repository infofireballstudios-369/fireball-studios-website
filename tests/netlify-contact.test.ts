import assert from "node:assert/strict";
import { test } from "node:test";
import { createNetlifyContactHandler, type NetlifyContactContext } from "../src/lib/server/netlifyContact";
import { createContactHandler } from "../src/lib/server/contactHandler";

const payload = { name: "Alex Smith", phone: "+44 7405 052555", email: "alex@example.com", message: "Please visualise our furniture collection.", website: "" };
const env = { NODE_ENV: "production", RESEND_API_KEY: "test-only-secret", CONTACT_FROM_EMAIL: "enquiries@fireballstudios.co.uk", URL: "https://fireball-test.netlify.app" };
const production: NetlifyContactContext = { deploy: { id: "deploy-production", context: "production", published: true }, site: { id: "site-fireball", url: "https://fireball-test.netlify.app" } };
const preview: NetlifyContactContext = { ...production, deploy: { id: "deploy-preview", context: "deploy-preview", published: false } };
const acceptingFetch: typeof fetch = async () => Response.json({ id: "provider-accepted" });
const unusedFetch: typeof fetch = async () => { throw new Error("Unexpected external request in Netlify contact test."); };
function enquiry(origin = "https://fireballstudios.co.uk", path = "/api/contact", body: unknown = payload): Request {
  return new Request("https://fireball-test.netlify.app" + path, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("the native function declares one explicit custom path and the Free domain/IP rule", async () => {
  const { config } = await import("../netlify/functions/contact.mjs");
  assert.equal(config.path, "/api/contact");
  assert.equal(config.method, "POST");
  assert.deepEqual(config.rateLimit, { action: "rate_limit", windowLimit: 2, windowSize: 180, aggregateBy: ["ip", "domain"] });
});

test("the native entry point reuses validated fixed-recipient delivery without a Redis account", async () => {
  let calls = 0;
  const handler = createNetlifyContactHandler({ env, fetch: async (_, init) => {
    calls++;
    const email = JSON.parse(String(init?.body));
    assert.deepEqual(email.to, ["info@fireballstudios.co.uk"]);
    assert.equal(email.reply_to, payload.email);
    assert.match(email.text, /Phone: \+44 7405 052555/);
    assert.ok(new Headers(init?.headers).get("idempotency-key"));
    return Response.json({ id: "provider-accepted" });
  } });
  assert.equal((await handler(enquiry(), production)).status, 202);
  assert.equal(calls, 1);
});

test("the generic Next.js fallback remains closed without a configured shared limiter", async () => {
  const fallback = createContactHandler({ env, fetch: unusedFetch });
  const request = enquiry();
  request.headers.set("netlify", "true");
  request.headers.set("x-nf-client-connection-ip", "192.0.2.14");
  assert.equal((await fallback(request)).status, 503);
});

test("headers cannot supply missing platform context and alternate function paths are rejected", async () => {
  const handler = createNetlifyContactHandler({ env, fetch: unusedFetch });
  const request = enquiry();
  request.headers.set("netlify", "true");
  request.headers.set("x-nf-client-connection-ip", "192.0.2.14");
  assert.equal((await handler(request, undefined)).status, 503);
  assert.equal((await handler(enquiry(undefined, "/.netlify/functions/contact"), production)).status, 404);
  assert.equal((await handler(enquiry(undefined, "/api/contact/"), production)).status, 404);
});

test("production accepts fixed public origins and a trusted canonical runtime URL, never Host-derived origins", async () => {
  const handler = createNetlifyContactHandler({ env, fetch: acceptingFetch });
  for (const origin of ["https://fireballstudios.co.uk", "https://www.fireballstudios.co.uk", "https://fireball-test.netlify.app"]) {
    assert.equal((await handler(enquiry(origin), production)).status, 202);
  }
  const request = enquiry("https://untrusted.example");
  request.headers.set("host", "untrusted.example");
  request.headers.set("x-forwarded-host", "untrusted.example");
  assert.equal((await handler(request, production)).status, 403);
  const fallback = createNetlifyContactHandler({ env: { ...env, URL: undefined }, fetch: acceptingFetch });
  assert.equal((await fallback(enquiry("https://fireball-test.netlify.app"), production)).status, 202);
});

test("a preview needs its exact explicitly configured origin and does not inherit canonical permission", async () => {
  const unconfigured = createNetlifyContactHandler({ env, fetch: unusedFetch });
  assert.equal((await unconfigured(enquiry(), preview)).status, 503);
  const origin = "https://deploy-preview-42--fireball-test.netlify.app";
  const configured = createNetlifyContactHandler({ env: { ...env, CONTACT_SITE_ORIGIN: origin }, fetch: acceptingFetch });
  assert.equal((await configured(enquiry(origin), preview)).status, 202);
  assert.equal((await configured(enquiry(), preview)).status, 403);
  assert.equal((await configured(enquiry("https://deploy-preview-43--fireball-test.netlify.app"), preview)).status, 403);
});

test("wildcards, paths, credentials and insecure explicit origins do not enable preview delivery", async () => {
  for (const origin of ["https://*.netlify.app", "https://example.com/", "https://example.com/path", "https://user:pass@example.com", "http://preview.example.com"]) {
    const handler = createNetlifyContactHandler({ env: { ...env, CONTACT_SITE_ORIGIN: origin }, fetch: unusedFetch });
    assert.equal((await handler(enquiry(origin), preview)).status, 503, origin);
  }
});

test("the native entry point retains origin, JSON, validation, honeypot and body-size protection", async () => {
  const handler = createNetlifyContactHandler({ env, fetch: unusedFetch });
  assert.equal((await handler(enquiry("https://untrusted.example"), production)).status, 403);
  const wrongType = enquiry();
  wrongType.headers.set("content-type", "text/plain");
  assert.equal((await handler(wrongType, production)).status, 415);
  assert.equal((await handler(enquiry(undefined, undefined, { ...payload, phone: "abc" }), production)).status, 400);
  assert.equal((await handler(enquiry(undefined, undefined, { ...payload, website: "bot" }), production)).status, 400);
  const oversized = enquiry();
  oversized.headers.set("content-length", "16385");
  assert.equal((await handler(oversized, production)).status, 413);
});

test("native responses carry their own security headers and preview noindex", async () => {
  const handler = createNetlifyContactHandler({ env, fetch: acceptingFetch });
  const response = await handler(enquiry(), production);
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(response.headers.get("x-robots-tag"), null);
  const previewResponse = await handler(enquiry(), preview);
  assert.match(previewResponse.headers.get("x-robots-tag") ?? "", /noindex/);
  const local = new Request("http://localhost:8888/api/contact", { method: "POST", headers: { origin: "http://localhost:8888", "content-type": "application/json" }, body: JSON.stringify(payload) });
  const localHandler = createNetlifyContactHandler({ env: { ...env, NODE_ENV: "development" }, fetch: acceptingFetch });
  const localResponse = await localHandler(local, { ...preview, deploy: { ...preview.deploy, context: "dev" } });
  assert.equal(localResponse.status, 202);
  assert.equal(localResponse.headers.get("strict-transport-security"), null);
  assert.match(localResponse.headers.get("x-robots-tag") ?? "", /noindex/);
});
