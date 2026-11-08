import { projectsData } from "./projectsData";
import { blogPosts } from "./blogData";
import type { ProjectCategory } from "@/types/portfolio";
import { shouldNoIndex } from "./environment";
export { shouldNoIndex } from "./environment";

export const siteUrl = "https://fireballstudios.co.uk";
export const siteName = "Fireball Studios";
export type SeoEnvironment = Record<string, string | undefined>;

export interface TopicFocus {
  primaryTopic: string;
  relatedTopics: readonly string[];
  /** Editorial prompts, not automatically published FAQ claims. */
  relatedQuestions: readonly string[];
}

export interface BreadcrumbItem { name: string; path: string }
export interface SeoPage extends TopicFocus {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  breadcrumbs: readonly BreadcrumbItem[];
  article?: { publishDate: string; author: string };
}

export function canonicalPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) throw new RangeError("Use a site-relative page path.");
  const url = new URL(path, siteUrl);
  if (url.origin !== siteUrl) throw new RangeError("The canonical must belong to Fireball Studios.");
  return url.pathname.replace(/\/+$/, "") || "/";
}

export function canonicalUrl(path: string): string {
  return siteUrl + canonicalPath(path);
}

const home: BreadcrumbItem = { name: "Home", path: "/" };

/** These topics describe existing service sections, not separate landing pages. */
export const industryTopics: Record<ProjectCategory, TopicFocus> = {
  "Real Estate": {
    primaryTopic: "property visualisation",
    relatedTopics: ["property CGI", "residential interiors", "architectural walkthroughs"],
    relatedQuestions: ["How does 3D visualisation support property marketing?", "What should a property visualisation brief include?"],
  },
  Architecture: {
    primaryTopic: "architectural visualisation",
    relatedTopics: ["interior visualisation", "lighting studies", "materials and finishes"],
    relatedQuestions: ["What can an architectural visualisation show?", "How do materials and daylight affect an interior visualisation?"],
  },
  Automotive: {
    primaryTopic: "automotive visualisation",
    relatedTopics: ["car configurator", "vehicle CGI", "interactive colour and finish options"],
    relatedQuestions: ["What is automotive visualisation used for?", "Which visual choices can a car configurator demonstrate?"],
  },
  "Product Design": {
    primaryTopic: "furniture and product visualisation",
    relatedTopics: ["furniture CGI", "product rendering", "studio and lifestyle imagery"],
    relatedQuestions: ["How can CGI help present a product?", "Which material references help a furniture visualisation?"],
  },
};

type StaticSeoPage = Omit<SeoPage, "breadcrumbs"> & { breadcrumb: string };
const staticPages: readonly StaticSeoPage[] = [
  {
    path: "/", title: "Photorealistic 3D Visualisation",
    description: "Fireball Studios creates 3D visualisation, animation and interactive experiences for property, automotive, furniture and products in the UK.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios architectural visualisation", breadcrumb: "Home",
    primaryTopic: "3D visualisation studio UK",
    relatedTopics: ["photorealistic CGI", "3D animation", "interactive visualisation"],
    relatedQuestions: ["What does Fireball Studios create?", "Which industries can use 3D visualisation?"],
  },
  {
    path: "/projects", title: "Selected Projects",
    description: "Explore Fireball Studios visualisation studies across property, architecture, furniture and interactive experiences.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios visualisation portfolio", breadcrumb: "Projects",
    primaryTopic: "3D visualisation portfolio",
    relatedTopics: ["property visualisation studies", "furniture imagery", "interactive car configurator"],
    relatedQuestions: ["What does the studio's visualisation work look like?", "Which projects include an interactive experience?"],
  },
  {
    path: "/industries", title: "Industries & Services",
    description: "3D visualisation for UK property, architecture, automotive, furniture and product brands. Explore studio studies and our live car configurator, then contact us for a tailored quote.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios visualisation services", breadcrumb: "Industries",
    primaryTopic: "3D visualisation services",
    relatedTopics: ["property CGI", "architectural visualisation", "furniture visualisation", "automotive visualisation"],
    relatedQuestions: ["How does visualisation support property marketing?", "What can an architectural visualisation show?", "How can CGI help present a product?"],
  },
  {
    path: "/about", title: "About the Studio",
    description: "Meet Fireball Studios: a UK 3D visualisation studio bringing property, automotive, furniture and product ideas to life.",
    image: "/posters/product-detail.webp", imageAlt: "Lounge chair and ottoman in a naturally lit interior", breadcrumb: "About",
    primaryTopic: "Fireball Studios visualisation process",
    relatedTopics: ["UK visualisation studio", "design review", "materials and lighting"],
    relatedQuestions: ["How does a visualisation project progress?", "When can I review the proposed views and imagery?"],
  },
  {
    path: "/blog", title: "Insights & Ideas",
    description: "Practical insights into property CGI, architectural visualisation, product imagery and interactive experiences from Fireball Studios.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios visualisation insights", breadcrumb: "Insights",
    primaryTopic: "3D visualisation insights",
    relatedTopics: ["CGI briefing", "visual storytelling", "material references", "creative concepts"],
    relatedQuestions: ["How do I prepare a visualisation brief?", "Should I choose stills, animation or an interactive tour?"],
  },
  {
    path: "/contact", title: "Start a Project",
    description: "Tell Fireball Studios about your visualisation project. Contact us for a tailored quote and our promise to match lower comparable quotes for the same scope and deliverables.",
    image: "/og-image.jpg", imageAlt: "Start a visualisation project with Fireball Studios", breadcrumb: "Contact",
    primaryTopic: "3D visualisation project enquiry",
    relatedTopics: ["CGI quote", "project brief", "visualisation pricing"],
    relatedQuestions: ["How do I discuss a visualisation project?", "What information should I send with an enquiry?"],
  },
  {
    path: "/privacy", title: "Privacy Notice",
    description: "How this website handles project enquiries and contact information.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios", breadcrumb: "Privacy",
    primaryTopic: "Fireball Studios privacy notice", relatedTopics: ["enquiry information"],
    relatedQuestions: ["How are my enquiry details used?"],
  },
  {
    path: "/terms", title: "Website Terms",
    description: "Information about studio studies, enquiries, quotations and website content.",
    image: "/og-image.jpg", imageAlt: "Fireball Studios", breadcrumb: "Terms",
    primaryTopic: "Fireball Studios website terms", relatedTopics: ["studio studies", "project enquiries"],
    relatedQuestions: ["What does a project enquiry confirm?", "How may I use the studio's imagery?"],
  },
];

/** Add an entry when publishing an article; questions guide its visible content. */
export const articleTopics: Record<string, TopicFocus> = {
  "how-to-brief-a-property-visualisation": {
    primaryTopic: "property visualisation brief",
    relatedTopics: ["property CGI references", "review feedback", "image deliverables"],
    relatedQuestions: ["What should I include in a property visualisation brief?", "How should I organise feedback?"],
  },
  "stills-animation-or-interactive-tour": {
    primaryTopic: "stills vs animation vs interactive tours",
    relatedTopics: ["visualisation formats", "architectural walkthrough", "360-degree panorama"],
    relatedQuestions: ["When should I choose still imagery?", "What does animation add?", "When is an interactive tour useful?"],
  },
  "furniture-visualisation-material-references": {
    primaryTopic: "furniture visualisation material references",
    relatedTopics: ["fabric and timber CGI", "product lighting", "lifestyle imagery"],
    relatedQuestions: ["Which material references should I provide?", "How does lighting affect a furniture visualisation?"],
  },
  "spaceship-concept-visualisation": {
    primaryTopic: "spaceship concept visualisation",
    relatedTopics: ["cinematic environment", "hangar concept", "composition and scale"],
    relatedQuestions: ["How does a concept scene communicate scale?", "How can lighting organise a cinematic environment?"],
  },
};

const entries: SeoPage[] = [
  ...staticPages.map(({ breadcrumb, ...page }) => ({
    ...page,
    breadcrumbs: page.path === "/" ? [home] : [home, { name: breadcrumb, path: page.path }],
  })),
  ...projectsData.map((project): SeoPage => ({
    path: "/projects/" + project.slug, title: project.title, description: project.description,
    image: project.coverImage,
    imageAlt: project.galleryImages.find((image) => image.src === project.coverImage)?.alt ?? project.title,
    ...industryTopics[project.category],
    breadcrumbs: [home, { name: "Projects", path: "/projects" }, { name: project.title, path: "/projects/" + project.slug }],
  })),
  ...blogPosts.map((post): SeoPage => ({
    path: "/blog/" + post.slug, title: post.title, description: post.excerpt,
    image: post.image, imageAlt: post.title,
    ...(articleTopics[post.slug] ?? { primaryTopic: post.category, relatedTopics: [], relatedQuestions: [] }),
    article: { publishDate: post.publishDate, author: post.author },
    breadcrumbs: [home, { name: "Insights", path: "/blog" }, { name: post.title, path: "/blog/" + post.slug }],
  })),
];

/** Page titles and descriptions come from this map or their project/article manifest. */
export const seoPages: Readonly<Record<string, SeoPage>> = Object.fromEntries(entries.map((page) => [page.path, page]));

export function getSeoPage(path: string): SeoPage | undefined {
  return seoPages[canonicalPath(path)];
}

export function getIndexableSeoPages(env: SeoEnvironment = process.env): SeoPage[] {
  return shouldNoIndex(env) ? [] : Object.values(seoPages);
}

/** Real file dimensions; unknown future assets omit dimensions instead of guessing. */
export const socialImageDimensions: Readonly<Record<string, { width: number; height: number }>> = {
  "/og-image.jpg": { width: 1200, height: 630 },
  "/posters/1.webp": { width: 1440, height: 810 },
  "/posters/2.webp": { width: 1440, height: 810 },
  "/posters/product-detail.webp": { width: 1440, height: 810 },
  "/posters/6.webp": { width: 1920, height: 1080 },
  "/posters/car-configurator.webp": { width: 1600, height: 900 },
  "/gallery/1/1.4.webp": { width: 1920, height: 1080 },
  "/gallery/2/2.4.webp": { width: 1920, height: 1080 },
  "/gallery/3/3.1.webp": { width: 1920, height: 1049 },
  "/gallery/3/3.4.webp": { width: 1920, height: 1049 },
  "/gallery/4/4.5.webp": { width: 1920, height: 1080 },
  "/gallery/5/5.2.webp": { width: 1920, height: 1080 },
};
