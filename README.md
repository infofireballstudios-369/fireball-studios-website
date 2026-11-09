# Fireball Studios — standalone static website

A complete, separate Fireball Studios portfolio built with Vite 8, TypeScript and GSAP ScrollTrigger. It uses the official brand mark, real studio imagery, local WebP storytelling and deferred Vimeo/3D experiences. All page content is generated into semantic HTML; the deployed site needs **no Node runtime, backend, API or database**.

The existing Next.js project at `../website-FB` is a read-only reference and is not changed by this project. The previous broken static starter is preserved locally in `.archive/original-20261109/`; it is neither built nor published.

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

There are 32 generated page documents: 18 primary pages, the 404, the old-article redirect and 12 legacy root HTML redirects. The isolated configurator is an additional standalone HTML experience. No local MP4 playback or video SDK is loaded on initial pages.

## Contact behaviour

The default form sends visitors to **FormSubmit**, a free hosted form service requiring no account. It forwards the four enquiry fields to **info@fireballstudios.co.uk** after recipient activation and its spam check. The provider’s default CAPTCHA stays enabled; no provider script loads in the website. Local validation, direct email and copy-brief alternatives remain available.

**Activation and inbox delivery are not yet verified.** Follow [CONTACT_SETUP.md](docs/CONTACT_SETUP.md): submit a labelled test from the contact page, activate the confirmation email, then check a second test in the mailbox. No email provider, mailbox password or API key is embedded in the site. Optional Formspree and draft-only modes are documented there.

## Static hosting and indexing

Vite uses `base: './'`, and all ordinary links/assets are relative to their HTML page. Each route has its own `index.html`, so both domain-root and repository-subdirectory hosting work. The404 is self-contained and uses the configured publication URL for its return link.

For a local build configuration, optionally copy `.env.example` to `.env`. Node 24 reads it for generation; explicit shell/CI values take precedence:

```sh
SITE_URL=https://YOUR-USERNAME.github.io/YOUR-NEW-REPOSITORY/ NOINDEX=false npm run build
```

Default local builds are **noindex previews**. The approved production URL is https://fireballstudios.co.uk/; its GitHub workflow enables indexing through the production repository variable. `SITE_URL` controls canonicals, schema and sitemap; it does not move your domain or contact the live project.

The owner authorised publication through the existing [GitHub repository](https://github.com/infofireballstudios-369/fireball-studios-website). A pinned, manually triggered Pages workflow publishes only `dist/`. The original live version is preserved in `archive/live-before-static-20261109`; the Next.js project remains untouched. See [launch and rollback details](docs/LIVE_LAUNCH.md) and [the deployment guide](docs/DEPLOYMENT.md). `public/CNAME` retains the existing domain; no DNS or email changes are needed.

GitHub's current Pages terms restrict using it to run an online business, e-commerce or commercial SaaS. This build is technically compatible with Pages; confirm that your intended publication is permitted before using it for the studio. See [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). No claim of unlimited free hosting is made.

## Editing and review

- [SEO, topic/keyword map and launch guidance](docs/SEO_GUIDE.md)
- [Contact activation and provider options](docs/CONTACT_SETUP.md)
- [Native media quality and bandwidth budgets](docs/MEDIA_QUALITY.md)
- [File and editing guide](docs/PROJECT_GUIDE.md)
- [Deployment, indexing and hosting limits](docs/DEPLOYMENT.md)
- [Media provenance and model/font credits](docs/ASSET_CREDITS.md)
- [Verification results](docs/VERIFICATION.md)

Original sources are not required to build or deploy: every runtime asset is shipped in `public/`. `npm run prepare:assets` is an optional owner-side reimport tool and reads the original libraries without changing them. See `public/media-manifest.json` for provenance and checksums.
