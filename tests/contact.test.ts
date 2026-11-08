import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactForm } from "../src/components/ui/ContactForm";
import { createContactHandler } from "../src/lib/server/contactHandler";
import {
  CONTACT_RATE_WINDOW_MS,
  createContactRateLimiter,
  createMemoryRateLimiter,
  getContactRateLimitKey,
  RateLimitUnavailable,
  type ContactEnvironment,
} from "../src/lib/server/rateLimit";

const payload = {
  name: "Alex Smith",
  phone: "+44 7405 052555",
  email: "alex@example.com",
  message: "We would like three interior images for a residential project.",
  website: "",
};
const baseEnv: ContactEnvironment = {
  NODE_ENV: "test",
  RESEND_API_KEY: "test-only-api-key",
  CONTACT_FROM_EMAIL: "enquiries@fireballstudios.co.uk",
};

function enquiry(body: unknown = payload, headers: Record<string, string> = {}): Request {
  return new Request("https://fireballstudios.co.uk/api/contact", {
    method: "POST",
    headers: { origin: "https://fireballstudios.co.uk", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function streamedEnquiry(stream: ReadableStream<Uint8Array>): Request {
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: { origin: "https://fireballstudios.co.uk", "content-type": "application/json" },
    body: stream,
    duplex: "half",
  };
  return new Request("https://fireballstudios.co.uk/api/contact", init);
}

const allow = async () => ({ allowed: true, retryAfter: 600 });
const unusedFetch: typeof fetch = async () => { throw new Error("Unexpected network request in test."); };
const acceptingFetch: typeof fetch = async () => Response.json({ id: "test-accepted-id" });

test("valid enquiries send sanitised plain text to the fixed recipient and return accepted", async () => {
  let calls = 0;
  const handler = createContactHandler({
    env: baseEnv,
    rateLimit: allow,
    fetch: async (url, init) => {
      calls += 1;
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal instanceof AbortSignal);
      const sent = JSON.parse(String(init?.body));
      assert.deepEqual(sent.to, ["info@fireballstudios.co.uk"]);
      assert.equal(sent.reply_to, "alex@example.com");
      assert.equal(sent.from, "Fireball Studios <enquiries@fireballstudios.co.uk>");
      assert.equal(sent.subject, "New project enquiry — Fireball Studios");
      assert.equal(sent.html, undefined);
      assert.match(sent.text, /Name: Alex Smith/);
      assert.match(sent.text, /Phone: \+44 7405 052555/);
      assert.doesNotMatch(sent.text, /Budget:|Timing:|Consent to respond:|Industry:|Company:/);
      assert.doesNotMatch(sent.text, /<script>|<b>|\u0000/);
      return Response.json({ id: "test-accepted-id" });
    },
  });
  const response = await handler(enquiry({ ...payload, name: " <b>Alex Smith</b> ", message: "<script>sample</script> We need interior visualisation.\u0000" }));
  assert.equal(response.status, 202);
  assert.equal((await response.json()).ok, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 1);
});

test("origin checks reject missing, opaque, forged and production loopback origins", async () => {
  const handler = createContactHandler({ env: { ...baseEnv, NODE_ENV: "production", CONTACT_SITE_ORIGIN: "http://localhost:3000" }, rateLimit: allow, fetch: unusedFetch });
  for (const origin of ["", "null", "https://fireballstudios.co.uk.evil.test", "https://fireballstudios.co.uk/", "https://evil.test", "http://localhost:3000", "https://127.0.0.1:3000"]) {
    assert.equal((await handler(enquiry(payload, { origin }))).status, 403, origin);
  }
  const missing = enquiry();
  missing.headers.delete("origin");
  missing.headers.set("host", "fireballstudios.co.uk");
  missing.headers.set("x-forwarded-host", "fireballstudios.co.uk");
  assert.equal((await handler(missing)).status, 403);
});

test("fixed, explicitly configured HTTPS and development loopback origins are accepted", async () => {
  for (const origin of ["https://fireballstudios.co.uk", "https://www.fireballstudios.co.uk", "https://preview.example.com"]) {
    const handler = createContactHandler({ env: { ...baseEnv, NODE_ENV: "production", CONTACT_SITE_ORIGIN: "https://preview.example.com" }, rateLimit: allow, fetch: acceptingFetch });
    assert.equal((await handler(enquiry(payload, { origin }))).status, 202);
  }
  const development = createContactHandler({ env: { ...baseEnv, NODE_ENV: "development" }, rateLimit: allow, fetch: acceptingFetch });
  assert.equal((await development(enquiry(payload, { origin: "http://localhost:3000" }))).status, 202);
  assert.equal((await development(enquiry(payload, { origin: "http://127.0.0.1:4173" }))).status, 202);
});

test("the endpoint accepts only POST with an uncompressed JSON body", async () => {
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch });
  const method = await handler(new Request("https://fireballstudios.co.uk/api/contact"));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "POST");
  assert.equal((await handler(enquiry(payload, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handler(enquiry(payload, { "content-encoding": "gzip" }))).status, 415);
});

test("malformed JSON, invalid fields, header injection and obsolete scope fields are rejected", async () => {
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch });
  for (const invalid of [null, [], { ...payload, name: "A" }, { ...payload, phone: "1234" }, { ...payload, industry: "Real Estate" }, { ...payload, email: "alex@example.com\r\nBcc: other@example.com" }, { ...payload, unexpected: "field" }]) {
    assert.equal((await handler(enquiry(invalid))).status, 400);
  }
  const request = enquiry();
  const malformed = new Request(request.url, { method: "POST", headers: request.headers, body: "{broken" });
  assert.equal((await handler(malformed)).status, 400);
});

test("UK and international phone formats are accepted and included in the delivered enquiry", async () => {
  for (const phone of ["07405 052555", "+44 (0)7405 052555", "(020) 7946 0000", "+1 (202) 555-0123", "0033 1 23 45 67 89", "+49 30 123456"] ) {
    const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: async (_, init) => {
      const sent = JSON.parse(String(init?.body));
      assert.ok(sent.text.includes("Phone: " + phone));
      return Response.json({ id: "test-phone-format" });
    } });
    assert.equal((await handler(enquiry({ ...payload, phone }))).status, 202, phone);
  }
});

test("missing, implausible and injected phone numbers are rejected before delivery", async () => {
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch });
  for (const phone of ["", "123456", "1234567890123456", "123-ABC-789", "++447405052555", "+44\n7405052555", "44+7405052555", "1234567;BCC:other@example.com", 12345678, null]) {
    assert.equal((await handler(enquiry({ ...payload, phone }))).status, 400, String(phone));
  }
  const { phone: omittedPhone, ...missingPhone } = payload;
  assert.ok(omittedPhone);
  assert.equal((await handler(enquiry(missingPhone))).status, 400);
});

test("the initial contact form presents four visible fields and one submission action", () => {
  const html = renderToStaticMarkup(createElement(ContactForm));
  const names = [...html.matchAll(/<(?:input|textarea)\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names.filter((name) => name !== "website"), ["name", "phone", "email", "message"]);
  const phoneInput = [...html.matchAll(/<input\b[^>]*>/g)].find((match) => match[0].includes('name="phone"'));
  assert.ok(phoneInput);
  assert.match(phoneInput[0], /type="tel"/);
  assert.match(html, /type="submit"/);
  assert.doesNotMatch(html, /<select|type="radio"|type="checkbox"|Enquiry progress|Continue/);
  assert.match(html, /Privacy notice/);
});

test("the honeypot never claims delivery or calls the email provider", async () => {
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch });
  const response = await handler(enquiry({ ...payload, website: "https://bot.example" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

test("the 16 KiB limit applies to declared and streamed byte lengths", async () => {
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch });
  assert.equal((await handler(enquiry(payload, { "content-length": "16385" }))).status, 413);
  assert.equal((await handler(enquiry(payload, { "content-length": "invalid" }))).status, 400);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(10 * 1024));
      controller.enqueue(new Uint8Array(7 * 1024));
    },
    cancel() { cancelled = true; },
  });
  assert.equal((await handler(streamedEnquiry(stream))).status, 413);
  assert.equal(cancelled, true);
  assert.equal((await handler(enquiry({ ...payload, message: "😀".repeat(5000) }))).status, 413);
});

test("a stalled request body times out and its stream is cancelled", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch: unusedFetch, bodyTimeoutMs: 10 });
  assert.equal((await handler(streamedEnquiry(stream))).status, 408);
  assert.equal(cancelled, true);
});

test("missing mail setup and unavailable rate limiting return honest service errors", async () => {
  for (const env of [{ ...baseEnv, RESEND_API_KEY: undefined }, { ...baseEnv, CONTACT_FROM_EMAIL: "invalid" }]) {
    const handler = createContactHandler({ env, rateLimit: allow, fetch: unusedFetch });
    const response = await handler(enquiry());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
  const production = createContactHandler({ env: { ...baseEnv, NODE_ENV: "production" }, fetch: unusedFetch });
  assert.equal((await production(enquiry())).status, 503);
});

test("provider failure, unconfirmed responses and network failure never report success", async () => {
  const transports: typeof fetch[] = [
    async () => Response.json({ message: "Secret provider error" }, { status: 422 }),
    async () => Response.json({}),
    async () => Response.json({ id: "" }),
    async () => new Response("not JSON"),
    async () => { throw new Error("Secret network error"); },
  ];
  for (const fetch of transports) {
    const handler = createContactHandler({ env: baseEnv, rateLimit: allow, fetch });
    const response = await handler(enquiry());
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.message, /Secret|test-only-api-key/);
  }
});

test("email delivery has a deadline and aborts the transport", async () => {
  let signal: AbortSignal | null | undefined;
  const handler = createContactHandler({
    env: baseEnv,
    rateLimit: allow,
    emailTimeoutMs: 10,
    fetch: async (_, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => undefined);
    },
  });
  assert.equal((await handler(enquiry())).status, 502);
  assert.equal(signal?.aborted, true);
});

test("five enquiries are allowed per ten minutes and a sixth receives Retry-After", async () => {
  let now = 1000;
  const rateLimit = createMemoryRateLimiter({ now: () => now });
  const handler = createContactHandler({ env: baseEnv, fetch: acceptingFetch, rateLimit });
  for (let index = 0; index < 5; index += 1) assert.equal((await handler(enquiry())).status, 202);
  const blocked = await handler(enquiry());
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "600");
  now += CONTACT_RATE_WINDOW_MS;
  assert.equal((await handler(enquiry())).status, 202);
});

test("memory storage remains bounded, preserves active limits and removes expired entries", async () => {
  let now = 0;
  const limit = createMemoryRateLimiter({ now: () => now, maxEntries: 2 });
  assert.equal((await limit("first")).allowed, true);
  assert.equal((await limit("second")).allowed, true);
  await assert.rejects(limit("third"), RateLimitUnavailable);
  for (let index = 0; index < 4; index += 1) await limit("first");
  assert.equal((await limit("first")).allowed, false);
  now += CONTACT_RATE_WINDOW_MS;
  assert.equal((await limit("third")).allowed, true);
});

test("untrusted proxy headers use a shared bucket; trusted valid addresses are hashed", () => {
  const request = enquiry(payload, { "x-forwarded-for": "192.0.2.14, 198.51.100.1" });
  assert.equal(getContactRateLimitKey(request, baseEnv), "contact:shared");
  const trusted = getContactRateLimitKey(request, { CONTACT_TRUST_PROXY: "true" });
  assert.match(trusted, /^contact:ip:[a-f0-9]{64}$/);
  assert.doesNotMatch(trusted, /192\.0\.2/);
  assert.equal(getContactRateLimitKey(request, { VERCEL: "1" }), trusted);
  assert.equal(getContactRateLimitKey(enquiry(payload, { "x-forwarded-for": "invalid" }), { VERCEL: "1" }), "contact:shared");
  assert.equal(getContactRateLimitKey(enquiry(payload, { "x-forwarded-for": "fe80::1%eth0" }), { VERCEL: "1" }), "contact:shared");
  const short = getContactRateLimitKey(enquiry(payload, { "x-forwarded-for": "2001:db8::1" }), { VERCEL: "1" });
  const expanded = getContactRateLimitKey(enquiry(payload, { "x-forwarded-for": "2001:0db8:0000:0000:0000:0000:0000:0001" }), { VERCEL: "1" });
  assert.equal(short, expanded);
});

test("production fails closed without Redis unless memory fallback is explicitly enabled", async () => {
  const closed = createContactRateLimiter({ env: { NODE_ENV: "production" }, fetch: unusedFetch });
  await assert.rejects(closed("key"), RateLimitUnavailable);
  const optedIn = createContactRateLimiter({ env: { NODE_ENV: "production", CONTACT_ALLOW_MEMORY_RATE_LIMIT: "true" }, fetch: unusedFetch });
  assert.equal((await optedIn("key")).allowed, true);
});

test("Redis uses one atomic Lua command with expiry and validates the result", async () => {
  let count = 4;
  const limit = createContactRateLimiter({
    env: { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-redis-token" },
    fetch: async (url, init) => {
      assert.equal(url, "https://example.upstash.io");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-redis-token");
      const command = JSON.parse(String(init?.body));
      assert.equal(command[0], "EVAL");
      assert.match(command[1], /INCR/);
      assert.match(command[1], /PEXPIRE/);
      assert.match(command[1], /PTTL/);
      assert.deepEqual(command.slice(2), [1, "hashed-key", CONTACT_RATE_WINDOW_MS]);
      count += 1;
      return Response.json({ result: [count, 599999] });
    },
  });
  assert.deepEqual(await limit("hashed-key"), { allowed: true, retryAfter: 600 });
  assert.deepEqual(await limit("hashed-key"), { allowed: false, retryAfter: 600 });
});

test("Redis misconfiguration or failure never silently falls back to memory", async () => {
  const configured = { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-redis-token", CONTACT_ALLOW_MEMORY_RATE_LIMIT: "true" };
  const transports: typeof fetch[] = [
    async () => Response.json({ error: "provider error" }, { status: 500 }),
    async () => Response.json({ result: [1, -1] }),
    async () => Response.json({ result: ["1", 600000] }),
    async () => { throw new Error("unavailable"); },
  ];
  for (const fetch of transports) await assert.rejects(createContactRateLimiter({ env: configured, fetch })("key"), RateLimitUnavailable);
  for (const env of [{ ...configured, UPSTASH_REDIS_REST_TOKEN: undefined }, { ...configured, UPSTASH_REDIS_REST_URL: "http://example.upstash.io" }]) {
    await assert.rejects(createContactRateLimiter({ env, fetch: unusedFetch })("key"), RateLimitUnavailable);
  }
});
