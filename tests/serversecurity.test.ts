import assert from "node:assert/strict";
import { test } from "node:test";
import { createContactHandler } from "../src/lib/server/contactHandler";
import { createContactRateLimiter, createMemoryRateLimiter, getContactRateLimitKey, RateLimitUnavailable, CONTACT_RATE_WINDOW_MS } from "../src/lib/server/rateLimit";
import { fetchJsonWithLimits } from "../src/lib/server/http";
import { contactSchema, sanitiseText } from "../src/lib/contactSchema";

const payload = { name: "Alex Smith", phone: "+44 7405 052555", email: "alex@example.com", message: "Please visualise our furniture collection.", website: "" };
const env = { NODE_ENV: "test", RESEND_API_KEY: "test-only-secret", CONTACT_FROM_EMAIL: "enquiries@fireballstudios.co.uk" };
const allow = async () => ({ allowed: true, retryAfter: 600 });
const unusedFetch: typeof fetch = async () => { throw new Error("Unexpected external request in security test."); };
function enquiry(body: unknown = payload): Request {
  return new Request("https://fireballstudios.co.uk/api/contact", { method: "POST", headers: { origin: "https://fireballstudios.co.uk", "content-type": "application/json" }, body: JSON.stringify(body) });
}
function streamedRequest(headers: HeadersInit, onCancel: () => void): Request {
  const init: RequestInit & { duplex: "half" } = { method: "POST", headers, body: new ReadableStream<Uint8Array>({ cancel: onCancel }), duplex: "half" };
  return new Request("https://fireballstudios.co.uk/api/contact", init);
}

test("identical retries across server instances use an opaque stable Resend idempotency key", async () => {
  const keys: string[] = [];
  const transport: typeof fetch = async (_, init) => {
    const key = new Headers(init?.headers).get("idempotency-key");
    assert.ok(key);
    assert.match(key, /^fireball-contact\/v1\/[a-f0-9]{64}$/);
    assert.doesNotMatch(key, /Alex|alex|7405|test-only-secret/);
    keys.push(key);
    return Response.json({ id: "provider-accepted" });
  };
  const first = createContactHandler({ env, rateLimit: allow, fetch: transport });
  const second = createContactHandler({ env, rateLimit: allow, fetch: transport });
  assert.equal((await first(enquiry())).status, 202);
  assert.equal((await second(enquiry({ ...payload, name: " <b>Alex Smith</b> " })) ).status, 202);
  assert.equal((await second(enquiry({ ...payload, message: "Please visualise another furniture collection." })) ).status, 202);
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);
});

test("an ambiguous delivery failure retains the same key on a later retry", async () => {
  const keys: string[] = [];
  const transport: typeof fetch = async (_, init) => {
    keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
    if (keys.length === 1) throw new Error("Connection lost after the provider might have accepted.");
    return Response.json({ id: "provider-accepted" });
  };
  assert.equal((await createContactHandler({ env, rateLimit: allow, fetch: transport })(enquiry())).status, 502);
  assert.equal((await createContactHandler({ env, rateLimit: allow, fetch: transport })(enquiry())).status, 202);
  assert.equal(keys[0], keys[1]);
});

test("rejected origins, content types, limits and declared oversized uploads cancel unread bodies", async () => {
  const cases: { status: number; headers: HeadersInit; rateLimit: typeof allow }[] = [
    { status: 403, headers: { origin: "https://untrusted.example", "content-type": "application/json" }, rateLimit: allow },
    { status: 415, headers: { origin: "https://fireballstudios.co.uk", "content-type": "text/plain" }, rateLimit: allow },
    { status: 429, headers: { origin: "https://fireballstudios.co.uk", "content-type": "application/json" }, rateLimit: async () => ({ allowed: false, retryAfter: 600 }) },
    { status: 413, headers: { origin: "https://fireballstudios.co.uk", "content-type": "application/json", "content-length": "999999" }, rateLimit: allow },
  ];
  for (const item of cases) {
    let cancelled = false;
    const request = streamedRequest(item.headers, () => { cancelled = true; });
    const response = await createContactHandler({ env, rateLimit: item.rateLimit, fetch: unusedFetch })(request);
    assert.equal(response.status, item.status);
    assert.equal(cancelled, true, String(item.status));
  }
});

test("oversized email acknowledgements are cancelled and never claim delivery", async () => {
  for (const declared of [false, true]) {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(9 * 1024)); }, cancel() { cancelled = true; } });
    const handler = createContactHandler({ env, rateLimit: allow, fetch: async () => new Response(stream, { headers: declared ? { "content-length": "9216" } : {} }) });
    const response = await handler(enquiry());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).ok, false);
    assert.equal(cancelled, true);
  }
});

test("a stalled provider response body has the same delivery deadline as the transport", async () => {
  let cancelled = false;
  const handler = createContactHandler({ env, rateLimit: allow, emailTimeoutMs: 10, fetch: async () => new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } })) });
  assert.equal((await handler(enquiry())).status, 502);
  assert.equal(cancelled, true);
});

test("the bounded HTTP helper aborts non-cooperative transports and rejects malformed provider UTF-8", async () => {
  let signal: AbortSignal | null | undefined;
  await assert.rejects(fetchJsonWithLimits(async (_, init) => { signal = init?.signal; return new Promise<Response>(() => undefined); }, "https://example.test", {}, { timeoutMs: 10, maxBytes: 1024 }));
  assert.equal(signal?.aborted, true);
  await assert.rejects(fetchJsonWithLimits(async () => new Response(new Uint8Array([0xff, 0xfe])), "https://example.test", {}, { timeoutMs: 100, maxBytes: 1024 }));
});

test("oversized Redis responses fail closed and release their streams", async () => {
  let cancelled = false;
  const limiter = createContactRateLimiter({ env: { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-token" }, fetch: async () => new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(5000)); }, cancel() { cancelled = true; } })) });
  await assert.rejects(limiter("contact-key"), RateLimitUnavailable);
  assert.equal(cancelled, true);
});

test("IPv6 privacy addresses share a /64 limit, while another network remains separate", () => {
  const key = (ip: string) => getContactRateLimitKey(new Request("https://fireballstudios.co.uk/api/contact", { headers: { "x-forwarded-for": ip } }), { CONTACT_TRUST_PROXY: "true" });
  assert.equal(key("2001:db8:1234:5678::1"), key("2001:db8:1234:5678:ffff:ffff:ffff:ffff"));
  assert.notEqual(key("2001:db8:1234:5678::1"), key("2001:db8:1234:5679::1"));
  assert.equal(key("192.0.2.14"), key("::ffff:192.0.2.14"));
});

test("Vercel's dedicated client address takes precedence over an overlay proxy header", () => {
  const key = (headers: HeadersInit) => getContactRateLimitKey(new Request("https://fireballstudios.co.uk/api/contact", { headers }), { VERCEL: "1" });
  assert.equal(key({ "x-vercel-forwarded-for": "192.0.2.14", "x-forwarded-for": "198.51.100.7" }), key({ "x-forwarded-for": "192.0.2.14" }));
  assert.equal(key({ "x-vercel-forwarded-for": "not-an-address", "x-forwarded-for": "198.51.100.7" }), "contact:shared");
});

test("memory expiry remains ordered when the clock briefly moves backwards", async () => {
  let now = 1000;
  const limiter = createMemoryRateLimiter({ now: () => now, maxEntries: 2 });
  await limiter("first");
  now = 500;
  await limiter("second");
  for (let index = 0; index < 4; index++) await limiter("first");
  assert.equal((await limiter("first")).allowed, false);
  now = 1000 + CONTACT_RATE_WINDOW_MS;
  assert.equal((await limiter("third")).allowed, true);
});

test("single-line names cannot spoof email fields and nested opening brackets sanitise predictably", () => {
  assert.equal(contactSchema.safeParse({ ...payload, name: "Alex\r\nPhone: other" }).success, false);
  assert.equal(sanitiseText("<".repeat(8000) + "A clear project description."), "A clear project description.");
});
