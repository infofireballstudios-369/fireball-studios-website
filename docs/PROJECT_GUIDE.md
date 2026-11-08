# Fireball Studios: where to find things

Start here when reviewing or editing the website. All paths below are relative to the project folder.

## Common changes

| I want to change… | Open this file |
| --- | --- |
| Project titles, categories, descriptions, photos or film assignments | `src/lib/projectsData.ts` |
| Interactive Residence photos | Its entry in `src/lib/projectsData.ts`; it uses only `3.4.webp` and `3.5.webp` |
| Homepage scroll headlines and descriptions | `src/lib/homeStory.ts` |
| Homepage scroll order or frame counts | `src/lib/assetManifest.ts` |
| Vimeo video IDs | `videoManifest` in `src/lib/assetManifest.ts` |
| Service descriptions and industry-to-project links | `src/lib/industriesData.ts` |
| Blog titles, article text and film assignments | `src/lib/blogData.ts` |
| Frequently asked questions | `src/lib/faqs.ts` |
| Search titles, descriptions and topic/keyword planning | `src/lib/seo.ts` and [SEO guide](SEO_GUIDE.md) |
| Colours, type sizes, spacing and mobile layouts | `src/app/globals.css` |
| Email address and telephone links | `src/lib/site.ts` |
| Enquiry form fields and messages | `src/components/ui/ContactForm.tsx` |
| Domain authentication and publishing | [Email and publishing guide](EMAIL_AND_PUBLISHING.md) |
| Security controls and scaling limits | [Security and scale notes](SECURITY_AND_SCALE.md) |
| Latest checks and outstanding external setup | [Review results](REVIEW_RESULTS.md) |

## Pages

| File | What it contains |
| --- | --- |
| `src/app/layout.tsx` | Shared fonts, navigation, footer, default metadata and business schema |
| `src/app/page.tsx` | Homepage section assembly |
| `src/app/projects/page.tsx` | Projects hub |
| `src/app/projects/[slug]/page.tsx` | One reusable template for every project |
| `src/app/industries/page.tsx` | Industry sections and related projects |
| `src/app/about/page.tsx` | Studio approach and process |
| `src/app/blog/page.tsx` | Searchable article hub |
| `src/app/blog/[slug]/page.tsx` | One reusable article template |
| `src/app/contact/page.tsx` | Contact details and the enquiry form |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | Website notices |
| `src/app/not-found.tsx` | Missing-page screen |
| `src/app/sitemap.ts`, `src/app/robots.ts` | Search discovery, derived from the central SEO map |

To add a project, add its entry and real assets to the manifest. To add an article, add it to the blog manifest and add its editorial topic entry in `seo.ts`. The dynamic templates, sitemap and metadata use those entries. No copy-and-paste page template is needed.

## Shared interface and animation

| File | Responsibility |
| --- | --- |
| `Navbar.tsx`, `Footer.tsx`, `Brand.tsx` in `src/components/ui/` | Shared navigation, contact links and branding |
| `PageHeader.tsx` | Page banner, visible breadcrumbs, breadcrumb schema and shared contact banner |
| `FeaturedProjects.tsx`, `ProjectsGrid.tsx` | Homepage cards and filtered portfolio; both use the same gallery data |
| `ProjectFilmDialog.tsx`, `VimeoPlayer.tsx` | Shared film dialog and player; Vimeo loads only after a play action |
| `ConfiguratorPlayer.tsx` | Deferred automotive viewer and isolated lifecycle messages |
| `BlogSearch.tsx` | Article search and filters |
| `ServicesOverlay.tsx`, `ProcessOverlay.tsx`, `FaqSection.tsx` | Reusable services, six-step process and FAQ sections |
| `JsonLd.tsx` | Safe structured-data output |
| `scroll/SequenceStory.tsx` | Three-chapter scroll controller |
| `scroll/SequencePlayer.tsx` | Reusable single-sequence player and story entry point |
| `src/lib/frameStore.ts` | Progressive fetching, request deadlines, decoding limits and image disposal |
| `src/types/portfolio.ts` | Shared project model |

The older unused page components and duplicate project manifest were removed. They remain recoverable from the previous Git commit if you need historical reference.

## Contact and server security

| File | Responsibility |
| --- | --- |
| `src/app/api/contact/route.ts` | POST endpoint |
| `src/lib/contactSchema.ts` | Shared field validation and plain-text sanitisation |
| `src/lib/server/contactHandler.ts` | Origin checks, bounded request reading and email delivery |
| `src/lib/server/rateLimit.ts` | Shared Redis protection and the explicit single-server fallback |
| `src/lib/server/http.ts` | Bounded provider responses, cancellation and timeouts |
| `.env.example` | Variable names and instructions; no real credentials |
| `.env.local` | Your local secrets, if created; excluded from Git |
| `next.config.ts` | Security headers, image-source restrictions and old-URL redirects |
| `src/lib/environment.ts` | Shared preview/noindex policy |
| `src/lib/schema.ts` | Business, service, article, project, FAQ and breadcrumb schema |

## Assets and scripts

`public/gallery/` holds genuine project stills. `public/frames/3`, `/6` and `/5` power the homepage. `public/posters/` holds small previews; `public/brand/` holds the logo. The large automotive viewer is under `public/experiences/car/`.

Archived films in `public/videos/`, old previews and unused motion sequences are preserved locally. Release exports exclude them because normal film playback uses Vimeo. Do not push this local repository's original large-file history directly to GitHub.

| Script | Use |
| --- | --- |
| `scripts/prepare-story-sequences.mjs` | Rebuild WebP sequences and import original galleries |
| `scripts/prepare-media.mjs` | Rebuild older source previews/posters when required |
| `scripts/import-configurator.mjs` | Reimport the car viewer while preserving its models and credits |
| `scripts/render-configurator-poster.mjs` | Rebuild the small preview from the supplied car model |
| `scripts/export-release.mjs` | Export source and runtime assets to a separate empty directory, excluding secrets and archived films |
| `.github/workflows/checks.yml` | GitHub checks for types, lint, tests, dependencies and build |
| `.github/dependabot.yml` | Weekly dependency and action update proposals |
| `tests/` | Contact/security, animation, media, portfolio, SEO and release-export regression checks |

## Review locally

Use Node.js 24. Run `npm ci`, then `npm run dev` and open `http://localhost:3000`.

Before release, run `npm run type-check`, `npm run lint`, `npm test` and `npm run build`. Use `git diff main` to review local changes. The production publishing process is explained separately so that the old website stays available until its replacement has been verified.
