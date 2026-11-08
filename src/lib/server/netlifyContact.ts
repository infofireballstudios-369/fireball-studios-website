import { createContactHandler } from "./contactHandler";
import { cancelBody } from "./http";
import type { ContactEnvironment, ContactRateLimiter } from "./rateLimit";

/** Netlify supplies this metadata as the handler argument, never from client headers. */
export interface NetlifyContactContext {
  deploy?: { id?: string; context?: string; published?: boolean };
  site?: { id?: string; url?: string };
}

function exactHttpsOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value === url.origin && !url.hostname.includes("*") && !url.username && !url.password ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

type ValidNetlifyContext = { deploy: { id: string; context: string; published: boolean }; site: { id: string; url?: string } };
function validContext(context: NetlifyContactContext | undefined): context is ValidNetlifyContext {
  return Boolean(typeof context?.site?.id === "string" && context.site.id && typeof context.deploy?.id === "string" && context.deploy.id && typeof context.deploy.context === "string" && typeof context.deploy.published === "boolean");
}

/** Native functions return their own headers; Next.js header rules do not wrap them. */
function secureResponse(response: Response, request: Request, production: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Cache-Control", "no-store");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  const url = new URL(request.url);
  if (url.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) headers.set("Strict-Transport-Security", "max-age=31536000");
  if (!production) headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Only the custom-path Netlify entry point may inject this platform limiter adapter. */
export function createNetlifyContactHandler(options: {
  env?: ContactEnvironment;
  fetch?: typeof globalThis.fetch;
  bodyTimeoutMs?: number;
  emailTimeoutMs?: number;
} = {}) {
  const env = options.env ?? process.env;
  // This adapter does not count requests. Netlify enforces the static function rule
  // before invocation; its Free policy is 2 per 180 seconds per domain/IP, with
  // up to 10 seconds of enforcement delay. Verify the rule after deployment.
  const platformLimiter: ContactRateLimiter = async () => ({ allowed: true, retryAfter: 180 });

  return async (request: Request, context: NetlifyContactContext | undefined): Promise<Response> => {
    const production = validContext(context) && context.deploy.context === "production" && context.deploy.published;
    const reject = (status: number, message: string) => {
      cancelBody(request.body);
      return secureResponse(Response.json({ ok: false, message }, { status }), request, production);
    };
    if (!validContext(context)) return reject(503, "The enquiry form is temporarily unavailable. Please email info@fireballstudios.co.uk.");
    // A default function URL or rewritten alternate path must not bypass the custom path.
    if (new URL(request.url).pathname !== "/api/contact") return reject(404, "This enquiry route is not available.");

    const explicitOrigin = exactHttpsOrigin(env.CONTACT_SITE_ORIGIN);
    if (env.CONTACT_SITE_ORIGIN && !explicitOrigin) return reject(503, "The enquiry form is temporarily unavailable. Please email info@fireballstudios.co.uk.");
    const local = env.NODE_ENV === "development" && context.deploy.context === "dev";
    if (!production && !local) {
      // Preview deployments require deliberate configuration; do not expose mail
      // credentials to untrusted PR previews or infer permission from their Host.
      if (!explicitOrigin) return reject(503, "The enquiry form is unavailable on this preview. Please email info@fireballstudios.co.uk.");
      if (request.headers.get("origin") !== explicitOrigin) return reject(403, "This enquiry origin is not permitted.");
    }
    const canonicalOrigin = production ? exactHttpsOrigin(env.URL) ?? exactHttpsOrigin(context.site.url) : undefined;
    const handler = createContactHandler({
      ...options,
      env: { ...env, CONTACT_SITE_ORIGIN: explicitOrigin ?? canonicalOrigin },
      rateLimit: platformLimiter,
    });
    return secureResponse(await handler(request), request, production);
  };
}
