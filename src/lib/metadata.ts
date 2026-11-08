import type { Metadata } from "next";
import { canonicalUrl, getSeoPage, shouldNoIndex, siteName, siteUrl, socialImageDimensions, type SeoEnvironment, type SeoPage } from "./seo";

function buildMetadata(page: SeoPage, env: SeoEnvironment): Metadata {
  const noIndex = shouldNoIndex(env);
  const title = page.title + " | " + siteName;
  const image = {
    url: new URL(page.image, siteUrl).href,
    alt: page.imageAlt,
    ...socialImageDimensions[page.image],
  };
  return {
    title: page.title,
    description: page.description,
    category: page.primaryTopic,
    alternates: { canonical: canonicalUrl(page.path) },
    robots: { index: !noIndex, follow: !noIndex, ...(noIndex ? {} : { googleBot: { index: true, follow: true, "max-image-preview": "large" } }) },
    openGraph: {
      title, description: page.description, url: canonicalUrl(page.path), siteName, locale: "en_GB",
      images: [image],
      ...(page.article ? { type: "article", publishedTime: page.article.publishDate, authors: [page.article.author], section: page.primaryTopic } : { type: "website" }),
    },
    twitter: { card: "summary_large_image", title, description: page.description, images: [{ url: image.url, alt: image.alt }] },
  };
}

/** Preferred entry point: the central map supplies each page's metadata. */
export function routeMetadata(path: string, env: SeoEnvironment = process.env): Metadata {
  const page = getSeoPage(path);
  if (!page) throw new RangeError("Add the page to the SEO map before generating its metadata: " + path);
  return buildMetadata(page, env);
}

/** Compatibility for explicit one-off overrides; existing titles retain their meaning. */
export function pageMetadata(title: string, description: string, path: string, image?: string): Metadata {
  const page = getSeoPage(path);
  return buildMetadata({
    path, title, description,
    image: image ?? page?.image ?? "/og-image.jpg",
    imageAlt: image && image !== page?.image ? title : page?.imageAlt ?? title,
    primaryTopic: page?.primaryTopic ?? title,
    relatedTopics: page?.relatedTopics ?? [],
    relatedQuestions: page?.relatedQuestions ?? [],
    breadcrumbs: page?.breadcrumbs ?? [],
    article: page?.article,
  }, process.env);
}
