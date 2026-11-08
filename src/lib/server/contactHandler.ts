import { createHmac } from "node:crypto";
import { contactEmail } from "../site";
import { contactSchema, type ContactPayload } from "../contactSchema";
import { cancelBody, fetchJsonWithLimits } from "./http";
import {
  createContactRateLimiter,
  getContactRateLimitKey,
  type ContactEnvironment,
  type ContactRateLimiter,
} from "./rateLimit";

const MAX_BODY_BYTES = 16 * 1024;
const RECIPIENT = contactEmail;
const PUBLIC_ORIGINS = new Set([
  "https://fireballstudios.co.uk",
  "https://www.fireballstudios.co.uk",
]);

function reply(status: number, message: string, headers: HeadersInit = {}): Response {
  return Response.json({ ok: status === 202, message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
}

function allowedOrigin(origin: string | null, env: ContactEnvironment): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (origin !== url.origin || url.username || url.password) return false;
    if (PUBLIC_ORIGINS.has(origin)) return true;

    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (loopback) return env.NODE_ENV === "development" && ["http:", "https:"].includes(url.protocol);

    const configured = env.CONTACT_SITE_ORIGIN;
    if (!configured) return false;
    const configuredUrl = new URL(configured);
    return configured === configuredUrl.origin && configuredUrl.protocol === "https:" && origin === configured;
  } catch {
    return false;
  }
}

class BodyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function readJsonBody(request: Request, timeoutMs: number): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(Number(declaredLength))) {
      throw new BodyError(400, "The request body is invalid.");
    }
    if (Number(declaredLength) > MAX_BODY_BYTES) throw new BodyError(413, "Please shorten your enquiry.");
  }
  if (!request.body) throw new BodyError(400, "Please include your enquiry details.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  const expiresAt = Date.now() + timeoutMs;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel().catch(() => undefined);
  }, timeoutMs);

  try {
    while (true) {
      if (expired || Date.now() >= expiresAt) throw new BodyError(408, "The upload timed out. Please try again.");
      const { done, value } = await reader.read();
      if (expired || Date.now() >= expiresAt) throw new BodyError(408, "The upload timed out. Please try again.");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new BodyError(413, "Please shorten your enquiry.");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    if (error instanceof BodyError) throw error;
    throw new BodyError(400, "Please provide a valid JSON enquiry.");
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

function enquiryText(data: ContactPayload): string {
  return [
    "New Fireball Studios project enquiry",
    "",
    "Name: " + data.name,
    "Phone: " + data.phone,
    "Email: " + data.email,
    "",
    "Project description:",
    data.message,
  ].join("\n");
}

export function createContactHandler(options: {
  env?: ContactEnvironment;
  fetch?: typeof globalThis.fetch;
  rateLimit?: ContactRateLimiter;
  bodyTimeoutMs?: number;
  emailTimeoutMs?: number;
} = {}): (request: Request) => Promise<Response> {
  const env = options.env ?? process.env;
  const fetcher = options.fetch ?? globalThis.fetch;
  const rateLimit = options.rateLimit ?? createContactRateLimiter({ env, fetch: fetcher });

  return async (request) => {
    const finish = (status: number, message: string, headers: HeadersInit = {}) => {
      if (status !== 202) cancelBody(request.body);
      return reply(status, message, headers);
    };
    if (request.signal.aborted) return finish(400, "The enquiry was interrupted. Please try again.");
    if (request.method !== "POST") return finish(405, "Use POST to submit an enquiry.", { Allow: "POST" });
    if (!allowedOrigin(request.headers.get("origin"), env)) return finish(403, "This enquiry origin is not permitted.");
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      return finish(415, "Please submit your enquiry as JSON.");
    }
    const encoding = request.headers.get("content-encoding");
    if (encoding && encoding.toLowerCase() !== "identity") return finish(415, "Compressed enquiry bodies are not supported.");

    try {
      const limit = await rateLimit(getContactRateLimitKey(request, env));
      if (!limit.allowed) {
        return finish(429, "Too many enquiries. Please wait before trying again.", { "Retry-After": String(limit.retryAfter) });
      }
    } catch {
      return finish(503, "The enquiry form is temporarily unavailable. Please email " + RECIPIENT + ".");
    }

    let body: unknown;
    try {
      body = await readJsonBody(request, options.bodyTimeoutMs ?? 4000);
    } catch (error) {
      return error instanceof BodyError
        ? finish(error.status, error.message)
        : finish(400, "We could not read your enquiry. Please try again.");
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) return finish(400, "Please check your name, phone number, email address and project description before trying again.");
    if (parsed.data.website.trim()) return finish(400, "We could not accept this enquiry.");

    const from = contactSchema.shape.email.safeParse(env.CONTACT_FROM_EMAIL ?? "");
    const apiKey = env.RESEND_API_KEY?.trim();
    if (!from.success || !apiKey || /[\r\n]/.test(apiKey)) {
      return finish(503, "The enquiry form is not yet available. Please email " + RECIPIENT + ".");
    }

    const email = {
      from: "Fireball Studios <" + from.data + ">",
      to: [RECIPIENT],
      reply_to: parsed.data.email,
      subject: "New project enquiry — Fireball Studios",
      text: enquiryText(parsed.data),
    };
    const emailBody = JSON.stringify(email);
    // Identical retries share Resend's 24-hour idempotency window across instances.
    // HMAC keeps the header opaque without storing enquiry data or adding a secret.
    const deliveryKey = "fireball-contact/v1/" + createHmac("sha256", apiKey).update(emailBody).digest("hex");
    try {
      const acknowledgement = await fetchJsonWithLimits(fetcher, "https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey, "Idempotency-Key": deliveryKey },
        body: emailBody,
        cache: "no-store",
        redirect: "error",
      }, { timeoutMs: options.emailTimeoutMs ?? 8000, maxBytes: 8 * 1024 });
      if (!acknowledgement || typeof acknowledgement !== "object" || !("id" in acknowledgement) || typeof acknowledgement.id !== "string" || !acknowledgement.id.trim()) {
        throw new Error("Email provider did not confirm acceptance.");
      }
      return finish(202, "Your enquiry has been accepted for delivery to Fireball Studios.");
    } catch {
      return finish(502, "We could not confirm that your enquiry was sent. Please email " + RECIPIENT + ".");
    }
  };
}
