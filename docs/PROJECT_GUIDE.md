# Fireball Studios: where to find things

All paths are relative to the project folder. Start with this guide, then use [publishing and email setup](EMAIL_AND_PUBLISHING.md), [security and scale](SECURITY_AND_SCALE.md), or the latest [review results](REVIEW_RESULTS.md).

## Common changes

| Change | File |
| --- | --- |
| Project titles, categories, photos and film assignments | `src/lib/projectsData.ts` |
| Interactive Residence gallery | Its manifest entry: only `3.4.webp` and `3.5.webp` |
| Homepage headlines and chapter copy | `src/lib/homeStory.ts` |
| Vimeo IDs, source frame counts and home order `3 → 6 → 5` | `src/lib/assetManifest.ts` |
| Service descriptions and related projects | `src/lib/industriesData.ts` |
| Articles and FAQs | `src/lib/blogData.ts`, `src/lib/faqs.ts` |
| Search titles, descriptions and editorial topics | `src/lib/seo.ts`; see [SEO guide](SEO_GUIDE.md) |
| Colours, typography, spacing and responsive layouts | `src/app/globals.css` |
| Studio email and telephone | `src/lib/site.ts` |
| Enquiry fields and validation | `src/components/ui/ContactForm.tsx`, `src/lib/contactSchema.ts` |
| Analytics settings and consent behaviour | `src/lib/analytics.ts`, `src/components/ui/AnalyticsConsent.tsx` |
| Hosting build and preview settings | `netlify.toml` |
| Shared page/static security policy | `src/lib/securityHeaders.ts`, `scripts/prepare-netlify-headers.mts` |

## Pages and shared interface

`src/app/layout.tsx` supplies fonts, navigation, footer, default metadata, business schema and the analytics consent integration. Each named folder under `src/app/` contains its page. The reusable project and article templates live at `projects/[slug]/page.tsx` and `blog/[slug]/page.tsx`; add manifest entries instead of copying page implementations. `sitemap.ts` and `robots.ts` use the central SEO map.

Shared components live in `src/components/ui/`:

| Component | Responsibility |
| --- | --- |
| `SiteLink.tsx` | Internal navigation with route prefetch disabled by default, reducing unused requests |
| `Navbar.tsx`, `Footer.tsx`, `Brand.tsx` | Navigation, contact links and branding |
| `PageHeader.tsx`, `JsonLd.tsx` | Banners, breadcrumbs, shared CTA and safe schema output |
| `FeaturedProjects.tsx`, `ProjectsGrid.tsx` | Featured cards and portfolio filters using the project manifest |
| `ProjectFilmDialog.tsx`, `VimeoPlayer.tsx` | Films load only after a play action |
| `ConfiguratorPlayer.tsx` | Explicit launch, isolated viewer messages, loading/errors and cleanup |
| `AnalyticsConsent.tsx` | Accept/reject controls and the footer preference control |
| `ServicesOverlay.tsx`, `ProcessOverlay.tsx`, `FaqSection.tsx` | Services, the six-step process and FAQs |

Use `SiteLink` for internal links. An explicit prefetch override should be a deliberate budget decision. Portfolio film numbers are independent of project IDs; source 6 is the spaceship concept for the home story and blog, not a portfolio entry.

## Contact: two entry points

| File | Responsibility |
| --- | --- |
| `netlify/functions/contact.mts` | Configured Netlify Free `/api/contact` entry point and native path rate rule |
| `src/lib/server/netlifyContact.ts` | Native wrapper, trusted platform context, explicit preview origins and API security headers |
| `src/app/api/contact/route.ts` | Generic Next.js/local endpoint; production fallback requires shared rate protection |
| `src/lib/server/contactHandler.ts` | Shared origin/body validation, fixed studio recipient and Resend delivery |
| `src/lib/server/rateLimit.ts` | Optional Redis protection for other hosts; bounded memory is development/single-server only |
| `src/lib/server/http.ts` | Provider response limits, cancellation and deadlines |
| `src/lib/contactResponse.ts` | Client success acknowledgement and empty platform rate-limit responses |
| `.env.example` | Setting names; actual credentials belong in ignored local files or host settings |

Netlify uses a declared platform rule, not a per-instance memory counter. Routing and platform HTTP 429 enforcement were verified on the public preview; recheck them after deployment changes. Keep the generic Next.js fallback closed in production without its own protection. Never enable its memory option on serverless hosting. See the [security notes](SECURITY_AND_SCALE.md) for the different policies and limits.

## Analytics

`src/lib/analytics.ts` owns the production/origin gates, 90-day preference, allowlisted page views and consent transitions. `AnalyticsConsent.tsx` connects that controller to storage, Google’s script and the UI. The ID and enable switch are in `.env.example`; GA4 Enhanced Measurement must be switched off before enabling the manual page-view integration.

Without acceptance, the integration does not load Google’s tag or send page views. Visitors can reject it and later use “Analytics preferences” in the footer. Routes sent to GA4 omit query strings and enquiry data. GA4 counts only consenting, measurable visits; use Netlify’s own usage dashboard for hosting limits.

## Media and generation

`public/gallery/` contains genuine stills. `public/frames/3`, `/6` and `/5` retain 96 source frames each. The homepage uses smaller generated atlases: 24 sampled views per chapter, packed into four content-hashed WebP images. `src/lib/atlasStore.ts` selects a tile; `frameStore.ts` bounds fetching, retries, decoding and disposal.

| Script/file | Use |
| --- | --- |
| `scripts/prepare-story-sequences.mjs` | Rebuild source frames from the original films and import original galleries |
| `scripts/prepare-budget-sequences.mjs` | Generate `public/atlases/` and `src/lib/generated/budgetSequences.ts` from those frames |
| `src/lib/generated/budgetSequences.ts` | Generated atlas paths, dimensions and counts; do not edit manually |
| `scripts/import-configurator.mjs` | Reimport the viewer, optimise embedded models and add the lifecycle bridge |
| `scripts/configurator-models.mjs` | Pinned glTF Transform compression, physical-bounds checks and coordinate restoration |
| `scripts/render-configurator-poster.mjs` | Generate the preview from the actual car model |
| `scripts/prepare-media.mjs` | Older preview/poster preparation when required |
| `scripts/export-release.mjs` | Export to a separate empty directory, omitting credentials, Git history and archived films |

After changing source frames, regenerate the atlases too. After changing the source configurator, rerun its importer; it runs glTF Transform 4.5.1 in a temporary directory without adding runtime dependencies. Preserve the vehicle and wheel model attribution. Only the viewer’s CSP permits the pinned decoder’s WebAssembly execution.

Archived local films and old previews remain available for preparation but are excluded from release exports. Do not push the original large-file local history directly to GitHub; follow the publishing guide’s release workflow.

## Checks and review

Use Node.js 24. Run `npm ci`, then `npm run dev` and open `http://localhost:3000`. Netlify-native routing requires Netlify’s deployment environment; ordinary Next.js development uses the generic endpoint.

Before release, run `npm run type-check`, `npm run lint`, `npm test`, `npm run check:media-budget` and `npm run build`. `.github/workflows/checks.yml` runs the repository checks, while Dependabot proposes dependency updates. Check the [review results](REVIEW_RESULTS.md) for what was actually verified; passing local tests does not prove live email, GA4, platform rate enforcement or browser/WebGL behaviour.
