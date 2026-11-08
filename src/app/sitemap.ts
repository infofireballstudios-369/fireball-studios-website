import type { MetadataRoute } from "next";
import { canonicalUrl, getIndexableSeoPages } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return getIndexableSeoPages().map((page) => ({
    url: canonicalUrl(page.path),
    ...(page.article ? { lastModified: page.article.publishDate } : {}),
  }));
}
