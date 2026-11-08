import type { NextConfig } from "next";
import { shouldNoIndex } from "./src/lib/environment";

const production = process.env.NODE_ENV === "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js statically rendered pages include inline hydration scripts.
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

// The imported viewer runs in an opaque sandbox; its pinned modules are isolated here.
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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [], maximumRedirects: 0, dangerouslyAllowLocalIP: false, dangerouslyAllowSVG: false },
  async redirects() {
    return [
      { source: "/blog/automotive-visualisation-brief", destination: "/blog/spaceship-concept-visualisation", permanent: true },
      ...["about", "projects", "industries", "contact", "privacy", "terms"].map((page) => ({ source: "/" + page + ".html", destination: "/" + page, permanent: true })),
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/process.html", destination: "/about#process", permanent: true },
      { source: "/visualisation.html", destination: "/industries", permanent: true },
      { source: "/services.html", destination: "/industries", permanent: true },
      { source: "/fireball-car-configurator2.html", destination: "/projects/car-configurator", permanent: true },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ...(shouldNoIndex() ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
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
  },
};

export default nextConfig;
