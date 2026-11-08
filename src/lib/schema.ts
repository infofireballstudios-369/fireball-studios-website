import type { Project } from "@/types/portfolio";
import type { BlogPost } from "./blogData";
import { contactEmail, contactPhone } from "./site";
import { canonicalUrl, siteUrl, type BreadcrumbItem } from "./seo";

export { siteUrl } from "./seo";
export type JsonLd = Record<string, unknown>;
export interface FaqItem { question: string; answer: string }
const organisationId = siteUrl + "/#organisation";

export function getBreadcrumbSchema(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name, item: canonicalUrl(item.path),
    })),
  };
}

export function getOrganizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "Organization", "@id": organisationId,
    name: "Fireball Studios", url: siteUrl, email: contactEmail, telephone: contactPhone,
    logo: siteUrl + "/brand/fireball-mark.webp",
    description: "3D visualisation, animation and interactive experiences for property, automotive, furniture, products and creative concepts.",
  };
}

export function getLocalBusinessSchema(): JsonLd {
  return {
    "@context": "https://schema.org", "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": siteUrl + "/#studio", name: "Fireball Studios", url: siteUrl,
    email: contactEmail, telephone: contactPhone, areaServed: { "@type": "Country", name: "United Kingdom" },
    parentOrganization: { "@id": organisationId },
    knowsAbout: ["3D visualisation", "Architectural visualisation", "Product visualisation", "3D animation", "Interactive tours"],
  };
}

export const getBusinessSchema = getLocalBusinessSchema;

export function getServiceSchema(name: string, description: string, path = "/industries"): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "Service", name, description,
    url: siteUrl + path, provider: { "@id": organisationId },
    areaServed: { "@type": "Country", name: "United Kingdom" },
  };
}

/** Portfolio entries use CreativeWork; game-specific markup is reserved for actual games. */
export function getCreativeWorkSchema(project: Project): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "CreativeWork",
    "@id": siteUrl + "/projects/" + project.slug + "#work",
    name: project.title, description: project.description,
    url: siteUrl + "/projects/" + project.slug, creator: { "@id": organisationId },
    image: [...new Set([project.coverImage, ...project.galleryImages.map((image) => image.src)])].map((image) => new URL(image, siteUrl).href),
    genre: project.category, keywords: project.features.join(", "),
    ...(project.video ? { encoding: { "@type": "VideoObject", name: project.title + " — project film", url: project.video.watchUrl, embedUrl: project.video.embedUrl, thumbnailUrl: siteUrl + project.coverImage, description: project.description } } : {}),
  };
}

export function getPortfolioGameSchema(project: Project): JsonLd {
  return getCreativeWorkSchema(project);
}

export function getArticleSchema(post: BlogPost): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title, description: post.excerpt,
    "@id": canonicalUrl("/blog/" + post.slug) + "#article",
    datePublished: post.publishDate, dateModified: post.publishDate,
    author: { "@type": "Organization", name: post.author, "@id": organisationId },
    publisher: { "@id": organisationId }, image: siteUrl + post.image,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl("/blog/" + post.slug) }, inLanguage: "en-GB",
    articleSection: post.category,
    video: post.video ? { "@type": "VideoObject", name: post.title + " — concept film", description: post.excerpt, embedUrl: post.video.embedUrl, url: post.video.watchUrl, thumbnailUrl: siteUrl + post.image } : undefined,
  };
}

export function getFAQSchema(items: readonly FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
}

export function serialiseSchema(schema: object): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c").replace(/&/g, "\\u0026");
}
