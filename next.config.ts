import type { NextConfig } from "next";
import { getSecurityHeaderRules } from "./src/lib/securityHeaders";

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
    return getSecurityHeaderRules();
  },
};

export default nextConfig;
