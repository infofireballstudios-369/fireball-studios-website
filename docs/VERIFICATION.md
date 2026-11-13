# Static website verification

## GA4 integration — 13 November 2026

- The existing stream is `G-7RV5GM0GCF`, property `556950277`, account `410359815`. No new property, private key or Netlify form deployment is required. The owner previously confirmed Enhanced Measurement was off; account settings could not be inspected in this session.
- `npm run type-check` and all **110 tests** pass. The analytics additions cover production eligibility, scoped CSP, consent controls, zero pre-consent transport, storage and tag failures, withdrawal/load races, cross-tab changes, expiry, safe page/referrer fields, MPA cookie continuity, duplicate initialisation and explicit BFCache returns. DOM tests use a simulated browser; they do not prove real Google event receipt.
- `npm audit --audit-level=moderate` reports zero known vulnerabilities. Both the static website and the unchanged isolated contact capture build successfully. The capture artifact contains no GA measurement ID, Analytics tag or analytics integration.
- The indexable production artifact has 32 documents and exactly 18 consent-enabled main pages. Its audit checks 738 local link references, 1,509 local asset references, 73 fragments, all 384 core animation frames and 18 sitemap URLs. Google scripts, connection hints and media players are absent from initial HTML. Redirects, errors and the configurator remain outside tracking.
- Static HTTP checks pass at the domain root and `/test-repository/`: 32 documents, 50 linked page targets, 46 asset targets, 65 fragments, 10 responsive candidates, seven stylesheet/font assets and the native 404 response for each prefix.
- The browser host and authenticated Analytics administration are unavailable. Real mobile/keyboard consent interactions, browser network/CSP execution and **GA4 Realtime receipt remain unverified**. See [ANALYTICS.md](ANALYTICS.md) for the real-browser acceptance, rejection, withdrawal and Realtime checks. The original Next.js project is read-only and is not part of this deployment.

## Original preparation record — 9 November 2026

This is the local preparation record. The later authorised production rollout and preserved old website are recorded in [LIVE_LAUNCH.md](LIVE_LAUNCH.md).

Applies to the isolated project at `fireball-gh-pages`, review branch `codex/seo-quality-contact`. No publication, push, merge, domain or DNS changes were made.

## Completed checks

- `npm run type-check`: passes.
- `npm audit --audit-level=moderate`: zero known vulnerabilities reported.
- `npm run dev -- --port 5176`: starts successfully; HTTP checks return 200 for the homepage, projects hub, residence detail, concept article and contact page, plus a native 4K WebP. Port 5175 was already occupied and was left untouched. Local review: `http://127.0.0.1:5176/`.
- `npm test`: **62 tests pass**. Coverage includes project/industry mappings, semantic SEO content and topic metadata, contact validation and provider transport/state, header measurement and cleanup, deferred media lifecycle, native-source quality provenance, bounded decoding, forward/reverse mapping, reduced motion and cramped-view text fallbacks.
- `npm run build`: passes in the actual standalone directory. Generates 20 documents and approximately **135.37 MB** of static files, including all optional quality tiers. Build audit verifies 516 local link references, 1,071 local asset references, 59 fragment references, 10 responsive image candidates, 109 image elements and 20 JSON-LD blocks. Original 384 frames remain valid; another 672 native-source derivatives and eight posters have recorded hashes and dimensions. Initial pages contain no active iframe/video or backend references.
- `npm run check:pages`: passes at `/` and `/test-repository/`, each covering 20 documents, 38 linked page targets, 46 asset targets, 51 valid fragments, 10 responsive candidates, seven font/style assets and a real 404 response. Checks do not submit forms or request external providers.
- An indexable repository-prefix build using `SITE_URL=https://example.test/fireball-static/ NOINDEX=false` passes metadata/sitemap validation with 18 indexable canonical URLs. Optional Formspree configuration was checked using a public example endpoint without sending data. Final output is restored to the default **noindex** review build and FormSubmit mode.
- The original Vimeo mappings and configurator remain unchanged; previous oEmbed checks returned the expected six film identifiers. This is not a new real-browser playback check.

The hero now reserves the measured masthead height and a clear gap. Chapter copy is never vertically centred into the header. Height-aware typography and actual text-fit checks restore the readable static story when a pinned chapter cannot fit. Unit/DOM checks support this behaviour; they are not a visual review.

## Enquiry delivery: activation required

The default native form POST targets only `https://formsubmit.co/info@fireballstudios.co.uk`. It retains the provider’s default CAPTCHA and opens the provider’s security/confirmation flow. No account or private API key is needed. CSP allows that provider only on Contact; no provider script loads on initial pages. Optional Formspree and email-draft modes are explicit build settings.

Local tests cover validation, fixed action/recipient, error retention, duplicate-send protection, provider refusal, network failure, timeout and honest acceptance messages. **No live activation, completed CAPTCHA, accepted real submission or confirmed inbox receipt was performed.** Follow [CONTACT_SETUP.md](CONTACT_SETUP.md), activate the recipient and verify a labelled test reaches the mailbox before claiming delivery.

## Read-only project isolation

A fresh before/after SHA-256, size and modification-time comparison matches all **765 non-cache source/media files (496,221,248 bytes)** in the Next.js reference project, with zero changes. Its Git status also matches the starting state, including the pre-existing untracked `.vscode/` folder. Dependency/build caches and Git internals were excluded. No build or write command ran against that project or the original media library.

The static project's original archive remains preserved outside published output. All implementation and media derivatives belong to this separate repository.

## Interactive review remains outstanding

The browser access host was unavailable on both attempts. Real desktop/mobile layout, font enlargement, keyboard navigation, rapid forward/reverse scrolling, reduced motion, Vimeo playback and WebGL controls still require an interactive review. Native media endpoint/contact-sheet inspection confirms genuine source content, not browser rendering speed or GPU memory use.

Native 4K sources preserve authentic recorded detail; no AI imagery or upscaling was introduced. Adaptive selection, one active chapter, progressive requests and pixel-budgeted decoding reduce unnecessary work. They do not guarantee traffic capacity: 5,000 complete uncached Full HD traversals are approximately 142 GB before other assets, exceeding GitHub Pages’ 100 GB soft monthly bandwidth allowance. See [MEDIA_QUALITY.md](MEDIA_QUALITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

Default preview indexing remains disabled until the intended publication URL is approved. The SEO/AEO work improves discoverability and useful answers; first-page positions and AI answer inclusion cannot be guaranteed. See [SEO_GUIDE.md](SEO_GUIDE.md).
