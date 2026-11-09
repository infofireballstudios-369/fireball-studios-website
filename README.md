# Fireball Studios — standalone static website

A complete, separate Fireball Studios portfolio built with Vite 8, TypeScript and GSAP ScrollTrigger. It uses the official brand mark, real studio imagery, local WebP storytelling and deferred Vimeo/3D experiences. All page content is generated into semantic HTML; the deployed site needs **no Node runtime, backend, API or database**.

The existing Next.js project at `/Users/hc/Documents/Fireball/website-FB` is a read-only reference and is not changed by this project. The previous broken static starter is preserved locally in `.archive/original-20261109/`; it is neither built nor published.

## Run locally

Use Node.js 24 (`.nvmrc` is included):

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5175/**. Direct page addresses such as `/projects/interactive-residence/` and `/blog/spaceship-concept-visualisation/` work without a client-side router.

```sh
npm test
npm run build
npm run preview
```

The production preview runs at **http://127.0.0.1:4175/**. Publish only the contents of **`dist/`**. The build runs TypeScript and checks all generated links, images, anchors, JSON-LD, frame files and repository-prefix paths.

## What is included

- Home with the required H1, progressive 96-frame chapters3→6→5, featured sources3/5, capabilities, FAQs and contact links.
- Six portfolio entries and category filters. Real Estate sources1/3/4, Architecture2, furniture/product5, and the Automotive configurator.
- Original gallery stills only; Interactive Residence has exactly 3.4/3.5 plus its Vimeo film. The two furniture images are WebP derivatives of original 5.1/5.2 PNGs.
- Industry links, the six-stage About process, four articles and a separate original spaceship concept article. Source6 is absent from the Projects portfolio.
- Compact name/phone/email/description contact form, accessible errors, direct email and brief-copy alternatives.
- Privacy/terms, static404, old-article redirect, canonicals, social metadata, business/service/FAQ/article/breadcrumb schema and sitemap.
- Local fonts, reduced-motion and short-viewport fallbacks, bounded frame decoding and explicit player lifecycle cleanup.

There are 20 generated page documents, including 18 primary pages, the404 and the old-article redirect. The isolated configurator is an additional standalone HTML experience. No local MP4 playback or video SDK is loaded on initial pages.

## Contact behaviour

The contact form prepares a **mailto draft to info@fireballstudios.co.uk**. The visitor reviews and sends it in their own email app. The website does not deliver or store the enquiry and never claims confirmed sending. If no email app opens, use the visible email link or copy the brief into webmail. No API keys or mailbox passwords are needed.

A hosted form service could be added later if requested and configured; none is enabled or silently assumed here.

## Static hosting and indexing

Vite uses `base: './'`, and all ordinary links/assets are relative to their HTML page. Each route has its own `index.html`, so both domain-root and repository-subdirectory hosting work. The404 is self-contained and uses the configured publication URL for its return link.

For a local build configuration, optionally copy `.env.example` to `.env`. Node 24 reads it for generation; explicit shell/CI values take precedence:

```sh
SITE_URL=https://YOUR-USERNAME.github.io/YOUR-NEW-REPOSITORY/ NOINDEX=false npm run build
```

Default builds are **noindex previews**, protecting the current live site's search presence. Choose the actual static publication URL before enabling indexing. `SITE_URL` controls canonicals, schema and sitemap; it does not move your domain or contact the live project.

A pinned, manually triggered GitHub Pages workflow is included. Use a **separate repository**, enable Pages → GitHub Actions, and follow [the deployment guide](docs/DEPLOYMENT.md). There is no CNAME and no automatic push/deployment or domain cutover.

GitHub's current Pages terms restrict using it to run an online business, e-commerce or commercial SaaS. This build is technically compatible with Pages; confirm that your intended publication is permitted before using it for the studio. See [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). No claim of unlimited free hosting is made.

## Editing and review

- [File and editing guide](docs/PROJECT_GUIDE.md)
- [Deployment, indexing and hosting limits](docs/DEPLOYMENT.md)
- [Media provenance and model/font credits](docs/ASSET_CREDITS.md)
- [Verification results](docs/VERIFICATION.md)

Original sources are not required to build or deploy: every runtime asset is shipped in `public/`. `npm run prepare:assets` is an optional owner-side reimport tool and reads the original libraries without changing them. See `public/media-manifest.json` for provenance and checksums.
