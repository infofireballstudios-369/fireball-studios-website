import { shouldNoIndex, type SiteEnvironment } from "./environment";

export interface SecurityHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

/** One policy for Next.js responses and Netlify's directly served static assets. */
export function getSecurityHeaderRules(env: SiteEnvironment = process.env): SecurityHeaderRule[] {
  const production = env.NODE_ENV === "production";
  const contentSecurityPolicy = [
    "default-src 'self'",
    // Statically rendered Next.js pages include inline hydration scripts.
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + (production ? "" : " 'unsafe-eval'"),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'self' https://player.vimeo.com",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com" + (production ? "" : " ws: wss:"),
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  // Only the isolated viewer permits its pinned Three.js modules and WASM decoder.
  const configuratorSecurityPolicy = [
    "default-src 'none'",
    "script-src 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/npm/three@0.170.0/",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "connect-src data: blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
    "form-action 'none'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return [{
    source: "/:path*",
    headers: [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(shouldNoIndex(env) ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
      ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ],
  }, {
    source: "/atlases/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }, { key: "X-Robots-Tag", value: "noindex" }],
  }, {
    source: "/experiences/car/fireball-car-configurator2.html",
    headers: [
      { key: "Content-Security-Policy", value: configuratorSecurityPolicy },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ],
  }];
}

/** Resolve each disjoint static selector to one final policy; never concatenate CSPs. */
export function getNetlifyHeaders(env: SiteEnvironment, staticPaths: readonly string[]): string {
  const rules = getSecurityHeaderRules(env);
  return [...new Set(staticPaths)].sort().map((path) => {
    const headers = new Map<string, string>();
    for (const { source, headers: additions } of rules) {
      const matches = source.endsWith("/:path*")
        ? path.startsWith(source.slice(0, -":path*".length))
        : path === source;
      if (matches) for (const { key, value } of additions) headers.set(key, value);
    }
    return path + "\n" + [...headers].map(([key, value]) => "  " + key + ": " + value).join("\n");
  }).join("\n\n") + "\n";
}
