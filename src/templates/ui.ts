import type { Project } from "../data/projects";
import { site } from "../data/site";

export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export const icon = (name: "arrow" | "play" | "menu" | "close" | "plus" | "search" = "arrow") => {
  const shapes = { arrow: '<path d="M5 19 19 5M5 5h14v14"/>', play: '<path d="m9 5 11 7-11 7Z"/>', menu: '<path d="M4 8h16M4 16h16"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>' };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${shapes[name]}</svg>`;
};
export const image = (src: string, alt: string, prefix: string, className = "", eager = false) => `<img src="${prefix}${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="${className}" width="1920" height="1080" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>`;
export const eyebrow = (text: string) => `<p class="eyebrow"><span></span>${escapeHtml(text)}</p>`;
export const link = (text: string, href: string, className = "text-link") => `<a class="${className}" href="${escapeHtml(href)}">${escapeHtml(text)}${icon()}</a>`;
export const brand = (prefix: string) => `<a class="brand" href="${prefix}" aria-label="Fireball Studios home"><img src="${prefix}brand/fireball-mark.webp" alt="" width="33" height="54"><span class="brand-wordmark">fireball<span>STUDIOS</span></span></a>`;

export function navbar(prefix: string, route: string): string {
  const items = [["Home", ""], ["Projects", "projects/"], ["Industries", "industries/"], ["About", "about/"], ["Blog", "blog/"], ["Contact", "contact/"]];
  return `<header class="site-header" data-site-header><div class="nav-inner">${brand(prefix)}<button class="menu-toggle" type="button" data-menu-toggle aria-label="Open navigation" aria-expanded="false" aria-controls="main-navigation">${icon("menu")}</button><nav id="main-navigation" data-navigation aria-label="Main navigation">${items.map(([name, path]) => `<a href="${prefix}${path}"${route === path ? ' aria-current="page"' : ""} class="${path && route.startsWith(path) ? "is-current" : ""}">${name}</a>`).join("")}<a class="button button-amber nav-cta" href="${prefix}contact/">Start a project${icon()}</a></nav></div></header>`;
}

export function footer(prefix: string): string {
  return `<footer class="site-footer"><div class="container footer-top"><div>${eyebrow("Start a conversation")}<h2>Let’s make it<br><em>visible.</em></h2></div><div class="footer-contact"><a class="footer-email" href="mailto:${site.email}">${site.email}${icon()}</a><a href="tel:${site.phone}">${site.phoneLabel}</a><p>United Kingdom · Working internationally</p></div></div><div class="container footer-bottom">${brand(prefix)}<nav aria-label="Footer navigation"><a href="${prefix}projects/">Projects</a><a href="${prefix}about/">The studio</a><a href="${prefix}blog/">Journal</a><a href="${prefix}contact/">Contact</a><a href="${prefix}privacy/">Privacy</a><a href="${prefix}terms/">Terms</a></nav><p>© ${new Date().getFullYear()} Fireball Studios</p></div></footer>`;
}

export function pageHeader(prefix: string, label: string, title: string, description: string, crumbs: { name: string; href?: string }[], src?: string): string {
  const trail = crumbs.map((item) => {
    const entry = item.href ? `<a href="${prefix}${item.href}">${escapeHtml(item.name)}</a>` : `<span aria-current="page">${escapeHtml(item.name)}</span>`;
    return `<span aria-hidden="true">/</span>${entry}`;
  }).join("");
  return `<header class="page-header${src ? " has-image" : ""}">${src ? image(src, "", prefix, "page-header-image", true) : ""}<div class="container page-header-content"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${prefix}">Home</a>${trail}</nav>${eyebrow(label)}<h1>${escapeHtml(title)}</h1><p class="page-intro">${escapeHtml(description)}</p></div></header>`;
}

export function projectCard(project: Project, prefix: string, index: number, featured = false): string {
  const cover = project.gallery.find((entry) => entry.src === project.cover) || project.gallery[0];
  return `<article class="project-card${featured ? " featured-card" : ""}" data-project-category="${escapeHtml(project.category)}" data-gallery><div class="project-media"><a class="project-image-link" href="${prefix}projects/${project.slug}/">${image(project.cover, cover?.alt || project.title, prefix, "project-image").replace('<img ', '<img data-gallery-image ')}<span class="media-arrow">${icon()}</span></a><span class="media-label">${project.interactive ? "Interactive experience" : "Studio study"}</span></div><div class="project-meta"><span>${escapeHtml(project.category)}</span><span>0${index + 1} / ${project.year}</span></div><div class="project-title-row"><h3><a href="${prefix}projects/${project.slug}/">${escapeHtml(project.title)}</a></h3>${project.videoId ? `<button class="film-link" data-video-trigger data-video-id="${project.videoId}" data-video-title="${escapeHtml(project.title)}" type="button" aria-label="Watch ${escapeHtml(project.title)} film">${icon("play")}<span>Watch film</span></button>` : `<a class="film-link" href="${prefix}projects/${project.slug}/">${icon("play")}<span>Explore 3D</span></a>`}</div><p class="project-description">${escapeHtml(project.description)}</p>${project.videoId ? `<noscript><a class="text-link" href="https://vimeo.com/${project.videoId}">Watch the film on Vimeo${icon()}</a></noscript>` : ""}${featured && project.gallery.length > 1 ? `<div class="gallery-choices" aria-label="${escapeHtml(project.title)} gallery">${project.gallery.map((entry, i) => `<button type="button" data-gallery-thumb data-src="${prefix}${escapeHtml(entry.src)}" data-alt="${escapeHtml(entry.alt)}" aria-pressed="${entry.src === project.cover}" aria-label="View image ${i + 1} of ${project.gallery.length}">${image(entry.src, "", prefix)}</button>`).join("")}<span>${String(project.gallery.length).padStart(2, "0")} original views</span></div>` : ""}</article>`;
}

export function filmPanel(prefix: string, id: string, title: string, poster: string): string {
  return `<div class="film-panel"><button type="button" class="film-poster" data-video-trigger data-video-id="${id}" data-video-title="${escapeHtml(title)}" aria-label="Play ${escapeHtml(title)} on Vimeo">${image(poster, "Preview of " + title, prefix)}<span class="film-poster-shade"></span><span class="play-disc">${icon("play")}</span><span class="film-caption"><span>Watch the study film</span><span>Vimeo${icon()}</span></span></button><a class="media-fallback" href="https://vimeo.com/${id}" target="_blank" rel="noopener noreferrer">Open the film on Vimeo <span class="sr-only">(opens in a new tab)</span>${icon()}</a></div>`;
}

export function filmDialog(): string {
  return `<dialog class="media-dialog" data-film-dialog aria-labelledby="film-dialog-title"><div class="dialog-header"><h2 id="film-dialog-title">Fireball Studios film</h2><button class="icon-button" type="button" data-film-close aria-label="Close film">${icon("close")}</button></div><div class="film-stage" data-film-stage></div><div class="dialog-bottom"><p data-film-status role="status">The film loads when you press play.</p><a data-vimeo-fallback href="https://vimeo.com" target="_blank" rel="noopener noreferrer">Open on Vimeo${icon()}<span class="sr-only"> (opens in a new tab)</span></a></div></dialog>`;
}

export const cta = (prefix: string) => `<section class="section cta-section"><div class="container cta-panel"><div>${eyebrow("Your next visual story")}<h2>Something in mind?<br>Let’s bring it into view.</h2><p>Tell us about your space, your product or your next big idea.</p></div>${link("Start a project", prefix + "contact/", "button button-amber")}</div></section>`;
