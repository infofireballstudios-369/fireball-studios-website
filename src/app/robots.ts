import type { MetadataRoute } from "next";
import { shouldNoIndex, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Crawlers must be able to read noindex metadata on preview pages.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, ...(shouldNoIndex() ? {} : { sitemap: siteUrl + "/sitemap.xml" }) };
}
