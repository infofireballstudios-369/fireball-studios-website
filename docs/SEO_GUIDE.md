# SEO and answer-focused content guide

This guide applies to the separate static Fireball Studios project. It does not change or publish the existing website, connect a search account or alter DNS. The site is prepared for crawling and clear answers, but first-page positions, indexing and inclusion in AI-generated answers cannot be guaranteed.

## The editing source of truth

Edit [src/data/seo.ts](../src/data/seo.ts) for each page’s search title, description, primary topic, related terms, questions and contextual links. `getPageSeo()` supplies `seoTitle` and `seoDescription` to the page templates; the generator uses these for the document title, description and Open Graph/Twitter metadata. The generator adds the studio name to the title. Do not add it repeatedly in the map.

The map has one entry for every generated document. It deliberately fails when a new project, article or route has no corresponding topic entry. This makes an omitted title or accidental duplicate topic easier to catch. The map is build-time data; it does not need to be downloaded by visitors.

| What to change | Source |
| --- | --- |
| Search titles, descriptions, editorial topics and related links | [src/data/seo.ts](../src/data/seo.ts) |
| Project names, briefs, gallery descriptions and film references | [src/data/projects.ts](../src/data/projects.ts) |
| Article titles, text, genuine publication dates and images | [src/data/blog.ts](../src/data/blog.ts) |
| Services, industry answers, FAQs and the six-stage process | [src/data/content.ts](../src/data/content.ts) |
| Studio name, contact details and business description | [src/data/site.ts](../src/data/site.ts) |
| Visible page structure, headings and contextual link placement | [src/templates/pages.ts](../src/templates/pages.ts) |
| Business, service, article, project and breadcrumb JSON-LD | [src/lib/schema.ts](../src/lib/schema.ts) |
| Canonical URL and indexing settings | [src/lib/build-config.ts](../src/lib/build-config.ts) |
| Generated metadata, sitemap and robots file | [scripts/generate-pages.ts](../scripts/generate-pages.ts) |

Project and article names remain their editorial H1s and breadcrumb labels. Search titles can add a useful description of the subject without renaming the work. For example, *An Icon, Reimagined* remains the project name; its search title identifies it as a furniture CGI study. The main home headline remains **Photorealistic 3D Visualisation That Brings Your Ideas to Life**.

Do not edit generated `index.html` files or `dist/`. Regenerate the site after changing content or metadata.

## Intentional topics, not repeated keywords

These topics organise the current pages. They are editorial choices based on the studio’s actual services and supplied work, not measured search-volume or competition claims.

| Page or section | Main intent |
| --- | --- |
| Home | UK 3D visualisation studio; formats and subjects the studio creates |
| Projects | Portfolio evidence across property, architecture, furniture and automotive work |
| Industries — Real Estate | Property CGI and residential presentation |
| Industries — Architecture | Architectural visualisation, daylight, materials and interiors |
| Industries — Furniture & products | Furniture CGI, product renders and material variants |
| Industries — Automotive | Automotive imagery and the live car configurator |
| About | The studio’s approach and six-stage visualisation process |
| Contact | Project enquiries, scope and tailored quotes |
| Property briefing article | What a property visualisation brief should include |
| Format comparison article | Choosing stills, animation or an interactive tour |
| Furniture reference article | Preparing useful materials, dimensions and finish references |
| Spaceship concept article | Composition, scale and lighting in an original studio concept |

The six project pages provide specific examples of those services. The spaceship concept remains a journal article and home chapter, not a client commission or automotive portfolio project. Recorded walkthroughs are labelled separately from the live car configurator.

`relatedTerms` and `questions` are planning aids, not hidden keyword lists. Use a related term only where it explains the subject naturally. The site does not emit a `meta keywords` tag. Avoid adding near-duplicate pages for towns, slightly different phrases or services without substantive new content. Google recommends descriptive titles and useful content rather than keyword repetition. [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [title-link guidance](https://developers.google.com/search/docs/appearance/title-link).

## Make answers useful and visible

Each article begins with a short answer and then develops it in practical sections. Industry questions introduce visible explanations, and relevant links connect guides to services and actual studies. These remain ordinary HTML when JavaScript is unavailable; the canvas is a visual layer above or behind readable content, not the source of the text.

When editing, state the answer clearly, explain decisions and give only examples the studio can support. Keep image descriptions about what is actually shown. Do not add invented client names, addresses, awards, qualifications, results, reviews, response guarantees or search statistics. Preserve model attribution and distinguish a studio study from commissioned work.

Google’s AI search guidance uses the same fundamentals as ordinary search: crawlable pages, useful visible content and valid structured data matching that content. No special AI schema or AI-only text file is required, and technical eligibility does not promise inclusion. [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

## Titles, snippets and structured data

Give every page a concise, distinctive title and a description that accurately summarises it. Put the important subject early and avoid forcing several unrelated queries into one sentence. Google may choose a different title or extract a snippet from visible content, so the metadata is a useful signal rather than a guaranteed search-result preview. Character counts are editing aids, not a promise of a fixed display length. [Title links](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet).

The site emits WebSite, Organization, LocalBusiness/ProfessionalService, Service, CreativeWork, Article, FAQPage and BreadcrumbList data where applicable. Business identifiers and media URLs follow the configured site URL, including a repository subdirectory. There is no invented street address, rating, price range or video upload date. The FAQ schema uses the actual visible home questions and answers; editorial questions in the topic map do not automatically become FAQ markup.

Structured data helps describe content. It does not establish that a studio claim is true or guarantee enhanced search results. Review it whenever the visible content changes. [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

## Preview and launch settings

Keep `NOINDEX=true` for the isolated preview. That is the default. Preview HTML includes a noindex directive, its sitemap has no page entries, and `robots.txt` permits crawling so a crawler can read the noindex instruction. Do not replace this with a blanket crawl block; Google must be able to access a page to see its noindex rule. [Block indexing guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

`SITE_URL` must be the approved public HTTPS URL with any repository path, for example `https://owner.github.io/repository/`. It controls canonical links, social-image URLs, structured-data identifiers and sitemap entries. It does not publish the site or configure a domain. Do not enable indexing for a duplicate preview while the existing public website remains the intended search destination.

For local configuration, optionally copy `.env.example` to `.env`. The npm generation and development commands load it; shell or CI variables take precedence. Keep secrets out of these public site settings.

Before an authorised launch:

1. Agree which public URL is the intended search destination. Set `SITE_URL` to that exact URL and use `NOINDEX=false` only for the approved indexable build.
2. Run `npm test` and `npm run build`. Check a home page, project and article in `dist/`: one descriptive title, one H1, the intended canonical, correct social images and indexable robots metadata.
3. Check `dist/sitemap.xml`: it should contain the 18 primary page URLs under the intended domain and repository path. It must exclude `404.html` and the old article redirect. Check the sitemap address in `dist/robots.txt`.
4. Review mobile and desktop rendering, working internal links and image descriptions. Test the site without JavaScript and with reduced motion. Automated checks do not replace a real browser review.
5. Publish only through the separately authorised deployment process. On GitHub Pages, the workflow uses the repository’s actual Pages URL and stays noindex unless repository variable `FIREBALL_INDEXING_ENABLED` is exactly `true`.
6. After publication, verify ownership in Google Search Console using an appropriate Domain or URL-prefix property. For a repository-hosted site, use its exact URL prefix. Submit the real sitemap URL, inspect representative pages and confirm Google can fetch the intended canonical.

Sitemap submission helps discovery; it does not force crawling or indexing. Watch indexing reports and real search queries, impressions and clicks before deciding what to improve. Add genuinely useful answers or case-study detail in response to evidence instead of producing more pages for variants of the same phrase. [Google’s sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

For an indexable build check that does **not** publish anything, build locally with an explicit test URL and `NOINDEX=false`, inspect the output, then rebuild with the intended preview settings. Do not upload a test-domain build.

## What is checked

[tests/seo.test.ts](../tests/seo.test.ts) checks complete topic-map coverage, unique effective metadata, unchanged editorial headings and breadcrumb names, visible article answers, contextual links and real section anchors, plus supported website/schema facts. The site and build checks cover the 20 documents, semantic HTML, local assets and repository-relative links.

The implementation does not claim that Search Console has been connected, that a new site has been published, or that any ranking has been achieved. Those are separate observable outcomes after an authorised launch.
