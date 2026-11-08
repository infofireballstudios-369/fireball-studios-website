# Fireball Studios SEO and answer-focused content guide

This site uses one topic map, the portfolio and article manifests, and server-rendered text. The aim is to help visitors and search systems understand the work accurately. These measures do not promise rankings, traffic, rich results or inclusion in an AI answer.

## Where to edit

| Change | File |
| --- | --- |
| Static page titles, descriptions, primary topics, related topics and questions | [src/lib/seo.ts](../src/lib/seo.ts), staticPages |
| Service topic groups | [src/lib/seo.ts](../src/lib/seo.ts), industryTopics |
| Article topic and question focus | [src/lib/seo.ts](../src/lib/seo.ts), articleTopics |
| Project title, description, cover image and gallery | [src/lib/projectsData.ts](../src/lib/projectsData.ts) |
| Article title, excerpt, image, publication date and content | [src/lib/blogData.ts](../src/lib/blogData.ts) |
| Metadata output and social cards | [src/lib/metadata.ts](../src/lib/metadata.ts) |
| Business, service, portfolio, article, FAQ and breadcrumb data | [src/lib/schema.ts](../src/lib/schema.ts) |
| Visible breadcrumb navigation and matching schema | [src/components/ui/PageHeader.tsx](../src/components/ui/PageHeader.tsx) |

The topic map derives project and article entries from their manifests. Do not duplicate their titles or image paths in a second list. Each page calls routeMetadata with its route, and each sub-page passes that same route to PageHeader.

## Managing topics and keywords

Choose one clear purpose for a page. Use primaryTopic to describe that purpose, relatedTopics for closely related language, and relatedQuestions for the questions the visible content should answer. These fields are editorial guidance; questions are not automatically turned into FAQ markup, and the site does not emit a list of meta keywords.

| Existing destination | Main subject |
| --- | --- |
| Home | UK 3D visualisation studio |
| Projects and individual studies | Evidence of the studio's visualisation work |
| Industries: Real Estate | Property CGI and residential visualisation |
| Industries: Architecture | Architectural and interior visualisation |
| Industries: Automotive | Vehicle imagery and the live car configurator |
| Industries: Product Design | Furniture and product visualisation |
| About | Studio approach and the six-step process |
| Insights | Briefing, formats, materials and the spaceship concept |
| Contact | Starting a visualisation enquiry |

Use these terms where they help explain the work. Do not repeat every topic in every title or create near-identical pages for cities where the studio has no verified presence. Keep studio studies labelled accurately and distinguish a recorded demonstration from a live interactive experience.

Write a specific title and a useful summary for each page. A description should explain what the visitor will find. Google may generate a different title link or snippet from the page, so the visible heading and content matter too. [Google title guidance](https://developers.google.com/search/docs/appearance/title-link), [Google snippet guidance](https://developers.google.com/search/docs/appearance/snippet).

## Answer-focused content

Introduce the topic with a direct, useful answer, then provide the detail that supports it: the project brief, visual references, choices, process, limitations and relevant work. Use descriptive headings and ordinary links to related projects or services. Keep important information in semantic HTML alongside the canvas, images and deferred players.

The relatedQuestions field is a planning aid. Publish an answer only when it is useful and accurate; do not add hidden questions solely for search engines. Original project imagery and specific explanations are more useful than repeating generic claims.

Google states that its AI features use the established SEO foundations and do not require a special AI schema or extra machine-readable text file. The current implementation therefore concentrates on accessible text, internal links, accurate structured data and useful media. [Google AI feature guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Adding a project or article

1. Add the entry to its manifest, using a stable, descriptive slug.
2. Supply its real title, description or excerpt, local image and descriptive image text. Keep concept work and third-party model attribution clear.
3. For a new article, add a matching entry to articleTopics. Projects inherit the topic group for their category.
4. Record the image's actual pixel dimensions in socialImageDimensions. Unknown images omit dimensions rather than inventing them; the SEO test flags an unregistered published social image.
5. Link the new content from a relevant hub or existing page. Manifest entries automatically join the sitemap and receive metadata and breadcrumbs.
6. If changing a published slug, add a permanent redirect in next.config.ts and update internal links. The old automotive article URL already redirects to the spaceship concept article.

Publication dates should describe publication, not the day a build ran. The current articles have no separate modification-date field; their original publication date is used. If substantial revisions need a separate date, add and display an explicit, accurate modification date before changing the schema and sitemap.

## Canonicals, social cards and previews

Canonicals always use https://fireballstudios.co.uk and omit query strings, fragments and trailing slashes. They do not use a preview hostname. Every page has its own Open Graph and Twitter title, description and image; project and article images follow the manifest. The shared default card is 1200 × 630 pixels. Other images declare their measured dimensions.

The following environments use noindex and nofollow metadata:

- VERCEL_ENV is present and is anything except production.
- SITE_NOINDEX is exactly true, for a custom staging deployment.

An ordinary self-hosted build without those flags remains indexable. Set deployment variables before building and rebuild when changing them, because pages are pre-rendered. Preview sitemaps are empty and do not advertise a sitemap in robots.txt.

Robots.txt permits crawling of pages so crawlers can read noindex; it excludes the API path. The deployment also needs the same preview rule in an X-Robots-Tag response header to cover standalone HTML assets outside the App Router. Noindex is an indexing instruction, not access control: use hosting authentication for a private preview. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

## Structured data limits

Breadcrumb JSON-LD uses the same route map as the visible trail. FAQ markup describes the visible questions and answers. Google discontinued FAQ rich results in May 2026, so do not sell this markup as a route to a Google FAQ result. [Google breadcrumb documentation](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), [Google documentation update](https://developers.google.com/search/updates#may-2026).

The business data contains the confirmed name, contact details and UK service area. No street address, opening hours, ratings or qualifications have been invented. Google's LocalBusiness rich-result requirements include an address; the current minimal business data does not establish that eligibility. Add an address only after confirming that it is accurate and intended for publication. [Google LocalBusiness documentation](https://developers.google.com/search/docs/appearance/structured-data/local-business).

Video objects identify the supplied Vimeo watch and embed URLs. They do not invent a downloadable content URL or upload date. A complete Google video-rich-result submission would need the relevant verified video facts and validation; the current schema is not a promise of that result.

## Checking and measuring

Run the local checks after changes:

    npm run type-check
    node --import tsx --test tests/seo.test.ts
    npm run build

The SEO tests cover route coverage, topic entries, canonical URLs, social metadata, preview rules, breadcrumbs, structured data and sitemap consistency. Review the built HTML for a representative page in each section: title, description, canonical, robots, Open Graph, Twitter and visible content.

After an authorised production deployment, use Google Search Console and Bing Webmaster Tools to inspect representative URLs and submit the canonical sitemap at https://fireballstudios.co.uk/sitemap.xml. Validate supported structured data with Google's Rich Results Test. Submission helps discovery; it does not guarantee indexing. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Use real search queries, page impressions, clicks and enquiry quality to decide what to improve. Review a useful period of data rather than changing topics after each short-term fluctuation. Do not invent search-volume estimates or claim that a particular wording guarantees an AI citation.
