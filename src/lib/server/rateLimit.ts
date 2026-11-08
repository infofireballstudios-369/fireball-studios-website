import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { fetchJsonWithLimits } from "./http";

export type ContactEnvironment = Record<string, string | undefined>;
export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}
export type ContactRateLimiter = (key: string) => Promise<RateLimitResult>;

export const CONTACT_RATE_LIMIT = 5;
export const CONTACT_RATE_WINDOW_MS = 10 * 60 * 1000;

export class RateLimitUnavailable extends Error {
  constructor() {
    super("The enquiry rate limiter is unavailable.");
    this.name = "RateLimitUnavailable";
  }
}

/** Group IPv6 privacy addresses by /64; mapped IPv4 addresses keep their IPv4 identity. */
function networkIdentity(address: string): string {
  if (isIP(address) === 4) return "v4:" + address;
  const canonical = new URL("http://[" + address + "]").hostname.slice(1, -1);
  const [left, right] = canonical.split("::");
  const leading = left ? left.split(":") : [];
  const trailing = right ? right.split(":") : [];
  const groups = right !== undefined
    ? [...leading, ...Array(8 - leading.length - trailing.length).fill("0"), ...trailing]
    : leading;
  const words = groups.map((group: string) => parseInt(group, 16));
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    return "v4:" + [words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join(".");
  }
  return "v6:" + words.slice(0, 4).map((word) => word.toString(16).padStart(4, "0")).join(":") + "::/64";
}

/** Proxy headers are usable only when the deployment controls and replaces them. */
export function getContactRateLimitKey(request: Request, env: ContactEnvironment): string {
  const trustsProxy = env.VERCEL === "1" || env.CONTACT_TRUST_PROXY === "true";
  if (!trustsProxy) return "contact:shared";

  const header = env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")
    : request.headers.get("x-forwarded-for");
  const forwarded = header?.split(",", 1)[0].trim();
  if (!forwarded || forwarded.length > 64 || forwarded.includes("%") || !isIP(forwarded)) return "contact:shared";
  return "contact:ip:" + createHash("sha256").update(networkIdentity(forwarded)).digest("hex");
}

/** Development fallback: expired entries are removed and capacity fails closed. */
export function createMemoryRateLimiter(options: {
  now?: () => number;
  maxEntries?: number;
} = {}): ContactRateLimiter {
  const now = options.now ?? (() => performance.now());
  const maxEntries = options.maxEntries ?? 5000;
  const buckets = new Map<string, { count: number; expiresAt: number }>();
  let lastTimestamp = -Infinity;

  return async (key) => {
    // Fixed expiry follows insertion order; prune expired entries without scanning active buckets.
    const timestamp = Math.max(lastTimestamp, now());
    lastTimestamp = timestamp;
    for (const [storedKey, bucket] of buckets) {
      if (bucket.expiresAt > timestamp) break;
      buckets.delete(storedKey);
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxEntries) throw new RateLimitUnavailable();
      bucket = { count: 0, expiresAt: timestamp + CONTACT_RATE_WINDOW_MS };
      buckets.set(key, bucket);
    }

    const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt - timestamp) / 1000));
    if (bucket.count >= CONTACT_RATE_LIMIT) return { allowed: false, retryAfter };
    bucket.count += 1;
    return { allowed: true, retryAfter };
  };
}

// Counting and expiry happen atomically, including repair of an unexpected missing TTL.
const rateLimitScript = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end",
  "return {count, ttl}",
].join("\n");

export function createContactRateLimiter(options: {
  env?: ContactEnvironment;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
} = {}): ContactRateLimiter {
  const env = options.env ?? process.env;
  const fetcher = options.fetch ?? globalThis.fetch;
  const memoryLimiter = createMemoryRateLimiter({ now: options.now });

  return async (key) => {
    const endpoint = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (!endpoint && !token) {
      if (env.NODE_ENV !== "production" || env.CONTACT_ALLOW_MEMORY_RATE_LIMIT === "true") {
        return memoryLimiter(key);
      }
      throw new RateLimitUnavailable();
    }
    if (!endpoint || !token) throw new RateLimitUnavailable();

    try {
      const url = new URL(endpoint);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        throw new RateLimitUnavailable();
      }
      const payload = await fetchJsonWithLimits(fetcher, url.origin, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(["EVAL", rateLimitScript, 1, key, CONTACT_RATE_WINDOW_MS]),
        cache: "no-store",
        redirect: "error",
      }, { timeoutMs: 3000, maxBytes: 4 * 1024 });
      const result = payload && typeof payload === "object" && "result" in payload ? payload.result : null;
      if (!Array.isArray(result) || result.length !== 2 || !Number.isSafeInteger(result[0]) || result[0] < 1 || !Number.isSafeInteger(result[1]) || result[1] < 0 || result[1] > CONTACT_RATE_WINDOW_MS) {
        throw new RateLimitUnavailable();
      }
      return {
        allowed: result[0] <= CONTACT_RATE_LIMIT,
        retryAfter: Math.max(1, Math.ceil(result[1] / 1000)),
      };
    } catch {
      throw new RateLimitUnavailable();
    }
  };
}
