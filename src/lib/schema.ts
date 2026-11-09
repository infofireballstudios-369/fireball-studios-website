import { site } from "../data/site";
import { industries, type Faq } from "../data/content";
import type { Project } from "../data/projects";
import type { BlogPost } from "../data/blog";

export type JsonLd = Record<string, unknown>;
export interface BreadcrumbItem { name: string; url: string }

/** Preserve a configured subdirectory, including a GitHub Pages repository path. */
function baseUrl(siteUrl: string): string {
  const url = new URL(siteUrl);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  return url.href;
}

function mediaUrl(path: string, siteUrl: string): string {
  return new URL(path, baseUrl(siteUrl)).href;
}

function videoSchema(id: string, name: string, description: string, thumbnail: string): JsonLd {
  return {
    "@type": "VideoObject",
    name,
    description,
    url: "https://vimeo.com/" + id,
    embedUrl: "https://player.vimeo.com/video/" + id,
    thumbnailUrl: thumbnail,
  };
}

export function getBusinessSchema(siteUrl: string): JsonLd[] {
  const url = baseUrl(siteUrl);
  const organisationId = url + "#organisation";
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": url + "#website",
      name: site.name,
      url,
      inLanguage: "en-GB",
      publisher: { "@id": organisationId },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organisationId,
      name: site.name,
      url,
      email: site.email,
      telephone: site.phone,
      logo: mediaUrl("brand/fireball-mark.webp", url),
      description: site.description,
    },
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "ProfessionalService"],
      "@id": url + "#studio",
      name: site.name,
      url,
      email: site.email,
      telephone: site.phone,
      areaServed: { "@type": "Country", name: "United Kingdom" },
      parentOrganization: { "@id": organisationId },
      knowsAbout: ["3D visualisation", "Architectural visualisation", "Product visualisation", "Automotive visualisation", "3D animation", "Interactive tours"],
    },
  ];
}

export function getServiceSchema(siteUrl: string): JsonLd[] {
  const base = baseUrl(siteUrl);
  return industries.map((industry) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": base + "industries/#" + industry.id + "-service",
    name: industry.name + " visualisation",
    description: industry.description,
    url: base + "industries/#" + industry.id,
    image: mediaUrl(industry.image, base),
    provider: { "@id": base + "#organisation" },
    areaServed: { "@type": "Country", name: "United Kingdom" },
  }));
}

export function getFaqSchema(faqs: readonly Faq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "en-GB",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** Breadcrumb URLs come from the renderer's canonical route builder. */
export function getBreadcrumbSchema(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Studio studies are CreativeWork entries, without invented commission or video facts. */
export function getProjectSchema(project: Project, url: string, siteUrl: string): JsonLd {
  const base = baseUrl(siteUrl);
  const canonical = new URL(url, base).href;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": canonical + "#work",
    name: project.title,
    description: project.description,
    url: canonical,
    creator: { "@id": base + "#organisation" },
    image: [...new Set([project.cover, ...project.gallery.map((image) => image.src)])].map((image) => mediaUrl(image, base)),
    genre: project.category,
    inLanguage: "en-GB",
    ...(project.videoId ? { encoding: videoSchema(project.videoId, project.title + " — study film", project.description, mediaUrl(project.cover, base)) } : {}),
  };
}

export function getArticleSchema(post: BlogPost, url: string, siteUrl: string): JsonLd {
  const base = baseUrl(siteUrl);
  const canonical = new URL(url, base).href;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": canonical + "#article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: { "@type": "Organization", name: post.author, ...(post.author === site.name ? { "@id": base + "#organisation" } : {}) },
    publisher: { "@id": base + "#organisation" },
    image: mediaUrl(post.image, base),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "en-GB",
    articleSection: post.category,
    ...(post.videoId ? { video: videoSchema(post.videoId, post.title + " — concept film", post.excerpt, mediaUrl(post.image, base)) } : {}),
  };
}

export function serialiseSchema(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/&/g, "\\u0026");
}
