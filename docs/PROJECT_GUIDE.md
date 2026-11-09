# Fireball Studios standalone project guide

This is a separate static portfolio built with Vite 8, TypeScript 7 and GSAP. Its intended working folder is `fireball-gh-pages`. The existing Next.js project at `../website-FB` remains unchanged and is not a dependency of ordinary builds.

The previous starter is preserved in `.archive/original-20261109`. It is an archive, not a deployment source. Publish only the new `dist/` output. This work has not published a website or changed DNS.

## Start and build

Use Node.js 24 for development and building:

~~~sh
npm ci
npm run dev
~~~

Open `http://127.0.0.1:5175/`. To check the finished site:

~~~sh
npm run type-check
npm test
npm run build
npm run preview
~~~

The preview server runs at `http://127.0.0.1:4175/`. Use an HTTP server rather than opening HTML with `file://`, because browser modules and asset requests need the normal web environment.

Optionally copy `.env.example` to `.env` to set `SITE_URL` and `NOINDEX` for local builds. The npm commands load that file when present; shell and CI environment values take precedence. Keep `NOINDEX=true` for the isolated preview. These settings are public configuration, not a place for API keys.

`npm run build` generates the pages, checks TypeScript, runs Vite and checks the output. `dist/` contains HTML, CSS, JavaScript, fonts, images, frame sequences and the deferred configurator. Visitors do not need Node.js, a Next.js server, a database or serverless functions.

## Where to edit

| Change | Main file |
| --- | --- |
| Studio name, contact details and description | [src/data/site.ts](../src/data/site.ts) |
| Portfolio titles, categories, briefs, gallery images and film IDs | [src/data/projects.ts](../src/data/projects.ts) |
| Articles, excerpts, dates and reading content | [src/data/blog.ts](../src/data/blog.ts) |
| Home chapters, services, industries, FAQs and six-stage process | [src/data/content.ts](../src/data/content.ts) |
| Source-film IDs, sequence counts and frame path helpers | [src/data/assetManifest.ts](../src/data/assetManifest.ts) |
| Page structure, page descriptions, About, Contact and legal copy | [src/templates/pages.ts](../src/templates/pages.ts) |
| Header, footer, cards, breadcrumbs and shared media markup | [src/templates/ui.ts](../src/templates/ui.ts) |
| Colours, typography, spacing and responsive layouts | [src/styles/site.css](../src/styles/site.css) |
| Canonicals, indexing configuration and relative route helpers | [src/lib/build-config.ts](../src/lib/build-config.ts) |
| Business, service, FAQ, project and article structured data | [src/lib/schema.ts](../src/lib/schema.ts) |
| HTML head, metadata, sitemap, robots and page generation | [scripts/generate-pages.ts](../scripts/generate-pages.ts) |
| Navigation and project filtering | [src/components/navigation.ts](../src/components/navigation.ts), [src/components/filters.ts](../src/components/filters.ts) |
| Gallery selections, Vimeo and configurator launch/close behaviour | [src/components/gallery.ts](../src/components/gallery.ts), [src/components/media.ts](../src/components/media.ts) |
| Scroll storytelling and bounded frame loading | [src/components/scroll-story.ts](../src/components/scroll-story.ts), [src/lib/frame-store.ts](../src/lib/frame-store.ts) |
| Contact validation, hosted submission, email and copy-brief fallback | [src/components/contact.ts](../src/components/contact.ts) |
| Client initialisation | [src/main.ts](../src/main.ts) |

Edit these source files instead of generated `index.html` files or `dist/`. After changing data or templates, run `npm run generate` and reload, or restart `npm run dev`; generation runs when the development command starts. CSS and client-code changes use Vite's normal development reload.

The generator produces 20 page documents: 18 primary pages, a standalone `404.html` and an old-article redirect page. Text, links, headings and structured data are present in real HTML before JavaScript runs. The layout is not an empty client-rendered shell.

## Portfolio and media rules

The six portfolio entries are the Garden Residence, Living in Light, An Icon, Reimagined, Interactive Residence, Bedroom Retreat and car configurator. Source IDs describe supplied films; they are separate from portfolio entry numbers. Home features source 3 and source 5 explicitly.

- Property uses sources 1, 3 and 4; architecture uses 2; furniture/products uses 5.
- Source 6 is the original spaceship studio concept. It belongs to the home story and article, not the Projects portfolio.
- `public/images/projects/` contains selected genuine gallery stills. Source 3 has only 3.4 and 3.5. Source 5 contains WebP derivatives of the genuine 5.1/5.2 PNGs, not a fabricated 5.3 image.
- `public/frames/3/`, `4/`, `5/` and `6/` contain continuous WebP sequences. Home plays 3 → 6 → 5; sequence 4 is available in the library. Do not replace gallery stills with arbitrary scroll frames.
- `public/images/posters/` contains display posters, and `public/brand/` contains the studio mark.

Media paths in the data are relative, such as `images/projects/3/3.4.webp`. The renderer adds the correct prefix for each page depth; avoid leading `/` asset paths that break a repository subdirectory.

The scroll story progressively loads frames and bounds decoded-image memory. It retains semantic copy and a still-image fallback for reduced motion or loading failure. Vimeo and the car configurator load only after an explicit click. Keep their close/disposal behaviour and avoid adding autoplay, hover-loaded players or an initial configurator iframe.

The prepared viewer is `public/experiences/car/fireball-car-configurator2.html`. Keep its isolation, dependency versions and model attribution. It uses third-party base models, so do not describe those models as original studio modelling. Read [ASSET_CREDITS.md](ASSET_CREDITS.md) before changing it.

Ordinary content edits need only the media already included here. `npm run prepare:assets` is a separate import operation requiring the original Projects archive and a read-only copy of the previous site's prepared assets. Its `--projects` and `--live` arguments identify those sources. Do not run it casually or point the destination at either source. `public/media-manifest.json` records origin paths, transformations, dimensions, sizes and hashes.

## Contact delivery and activation

The four fields are name, phone, email and project description. Default `FORM_PROVIDER=formsubmit` uses a native POST to `https://formsubmit.co/info@fireballstudios.co.uk`, keeping the provider’s security challenge. No provider JavaScript or email credential is loaded. The recipient must activate the form through their mailbox; test actual receipt before claiming it works. See [CONTACT_SETUP.md](CONTACT_SETUP.md).

`FORM_PROVIDER=formspree` plus a verified `FORMSPREE_ENDPOINT` enables asynchronous sending and provider-acceptance status. `FORM_PROVIDER=email` retains the draft-only behaviour. All modes keep direct-email and copy-brief alternatives. The static site has no server API or database; a hosted provider processes submitted information as described in the privacy page.

## Content and verification

Use standard UK English and describe the studio's 3D visualisation work accurately. Keep concept work labelled as studies, distinguish recorded demonstrations from the live configurator, and retain the six stages: Understand, Design & Model, Design Review, Visualise, Review & Refine, Deliver. Do not add qualifications, guarantees, client outcomes or addresses without verified information.

Run the checks above after changes. Automated checks cover data/asset consistency, local links and generated output, plus relevant component behaviour. They do not replace a visual browser review. The browser host was unavailable during preparation, so actual desktop/mobile layouts, touch interaction, Vimeo playback and WebGL operation still need review.

Before publishing, test keyboard navigation, focus return after closing media, all category filters, forward/reverse scrolling, reduced motion, slow or blocked media, form validation, the hosted submission, activation and email/copy fallbacks. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for hosting eligibility, manual publication and indexing settings.

## Where the latest improvements live

- [src/data/seo.ts](../src/data/seo.ts): one intentional topic, related terms, questions, search metadata and contextual links per route.
- [docs/SEO_GUIDE.md](SEO_GUIDE.md): editing and launch checks; search rankings cannot be guaranteed.
- [src/components/header-size.ts](../src/components/header-size.ts): measures the real masthead so the hero clears the logo.
- [src/lib/form-endpoint.ts](../src/lib/form-endpoint.ts) and [send-enquiry.ts](../src/lib/send-enquiry.ts): approved provider destinations and optional Formspree transport.
- [docs/MEDIA_QUALITY.md](MEDIA_QUALITY.md): source resolutions, adaptive quality, cache limits and transfer budgets.
- [scripts/prepare-quality-assets.mjs](../scripts/prepare-quality-assets.mjs): optional original-source extraction; ordinary builds use shipped files.

## Production publication and rollback

The owner has authorised the existing GitHub repository and fireballstudios.co.uk for this static replacement. [LIVE_LAUNCH.md](LIVE_LAUNCH.md) records the backup, publication checks and rollback procedure. Local builds stay noindex unless explicitly configured for production.
