# Fireball Studios

A Next.js 16 App Router website for 3D visualisation, animation and interactive experiences. TypeScript, Tailwind CSS, GSAP and the Dark Studio theme support property, automotive, furniture, products and creative concepts.

## Start here

- [File and editing guide](docs/PROJECT_GUIDE.md)
- [Email, GA4 and publishing setup](docs/EMAIL_AND_PUBLISHING.md)
- [Free hosting budget and monitoring](docs/BUDGET_AND_USAGE.md)
- [Security and scaling](docs/SECURITY_AND_SCALE.md)
- [SEO/AEO topic management](docs/SEO_GUIDE.md)
- [Verification and remaining checks](docs/REVIEW_RESULTS.md)

## Local review

Use Node.js 24. The dedicated local repository retains original large videos; do not push its history directly to GitHub. Local work remains on `codex/vimeo-portfolio-refresh`. The existing GitHub repository has a separate clean review branch, `codex/security-seo-launch-20261108`; `main` and the old live site remain unchanged pending approval.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Google fonts are fetched at build time and served locally.

```sh
npm run type-check
npm run lint
npm test
npm run check:media-budget
npm run build
npm start
```

Tests mock delivery and never send enquiries. GitHub CI runs these checks plus a dependency audit. Browser and real email checks are separate from compilation.

## Hosting at £0 initially

The selected stack is the existing GitHub repository, Netlify Free, Resend Free and GA4 Standard. The Netlify project is `fireball-studios-web`, in the existing `info-fireballstudios` team. The account was verified as Free with 300 shared monthly credits, no payment method and automatic top-ups disabled. Do not enable paid plans or recharge without the owner's approval.

Netlify Free has a hard usage cap: the site can pause when its credits run out. Fewer than 5,000 visitors does not guarantee uninterrupted free hosting. Page views, data transferred, 3D launches, functions and production deploys also count. See the budget guide before enabling higher-resolution media or increasing deployment frequency. Draft deploys have no production-deploy credit charge; their traffic still counts.

`netlify.toml` configures Next.js, the native contact function and non-indexable previews. GitHub Pages cannot run this app's email endpoint. Keep the existing domain and Pages site intact until the Netlify preview and email delivery have been reviewed. Follow the publishing guide for Git integration and the 123 Reg DNS cutover.

## Content and routes

| Route | Content |
| --- | --- |
| `/` | Scroll story 3 → 6 → 5, services, featured sources 3 and 5, pricing and FAQs |
| `/projects`, `/projects/[slug]` | Six portfolio entries, category filters, galleries and deferred films/configurator |
| `/industries` | Related property, architecture, automotive and furniture/product work |
| `/about` | Studio approach and six-stage process |
| `/blog`, `/blog/[slug]` | Searchable insights, including the original spaceship concept |
| `/contact` | Name, phone, email and project description |
| `/privacy`, `/terms` | Website notices |
| `/sitemap.xml`, `/robots.txt` | Search discovery |

`src/lib/projectsData.ts` is the portfolio source of truth. Source asset IDs differ from portfolio IDs. Real Estate uses sources 1, 3 and 4; Architecture uses 2; furniture/product uses 5. Automotive contains the configurator. Source 6 belongs to the home story and blog, never the portfolio. Featured sources 3 and 5 are selected explicitly. Interactive Residence uses only genuine 3.4 and 3.5 gallery stills, plus its film, on Home and Projects.

Existing project URLs remain available. `/blog/automotive-visualisation-brief` permanently redirects to `/blog/spaceship-concept-visualisation`. The process is Understand → Design & Model → Design Review → Visualise → Review & Refine → Deliver. Do not invent clients, qualifications or commercial results.

## Films and scroll media

`src/lib/assetManifest.ts` centralises source IDs, Vimeo watch/embed URLs and original frame counts. Vimeo sources 1–6 map respectively to `1243948791`, `1243948789`, `1243951425`, `1243948790`, `1243948881` and `1243948923`. Normal playback serves a local poster first and creates one iframe only on request, with a direct Vimeo fallback. Check Vimeo domain privacy on the eventual production hostname.

Homepage scrubbing remains local WebP/GSAP. Its default uses 24 sampled frames per chapter packed into 12 content-hashed atlases, approximately 0.79 MB total. It requests only current/nearby sheets, retains at most two decoded sheets in the active chapter, supports reverse scrubbing and preserves aspect ratio. Reduced-motion/short viewports use static content. Original 96-frame sequences remain in `public/frames/{3,6,5}` for regeneration; they are not wholesale preloaded. Original gallery stills live separately in `public/gallery/`.

Rebuild source 6 from the MOV directly, then regenerate the lower-data atlases:

```sh
FFMPEG_PATH=/absolute/path/to/ffmpeg node scripts/prepare-story-sequences.mjs ../Projects --sequences=6
node scripts/prepare-budget-sequences.mjs
npm run check:media-budget
```

The source is `../Projects/Edited-2/6.mp4.mov`; the selected continuous segment is 7.60–12.933 seconds at 18fps. Gallery originals come from `../Projects/Images`. Keep source media intact. The clean release exporter excludes archived videos, old previews and obsolete motion assets from deployment.

## Automotive viewer

`/projects/car-configurator` launches the isolated viewer only on request. The compressed embedded-model HTML is approximately 2.48 MB with gzip, rather than the original 10.89 MB gzip. Meshopt preparation preserves geometry, controls and the original CC BY 4.0 credits. Pinned Three.js 0.170.0 modules load from jsDelivr only after launch. The viewer's scoped CSP permits its required WebAssembly decoder; ordinary pages retain their tighter policy.

The sandbox validates lifecycle messages, pauses when hidden and releases resources on close. A standalone launch link is available. The poster is an offline render of the supplied model. Regenerate from the untouched original:

```sh
node scripts/import-configurator.mjs
node scripts/render-configurator-poster.mjs
```

Model preparation uses the pinned glTF Transform CLI. Actual browser/WebGL appearance and mobile controls still require preview review.

## Contact and analytics

For Netlify, add two server-only values securely in project environment settings: `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` (a bare address on a verified Resend sending domain). Keep them out of chat, Git and `NEXT_PUBLIC_*`. No Redis account is required for Netlify: its native function has a platform rule of two requests per IP/domain per 180 seconds, with up to ten seconds of enforcement delay. The generic Next.js API fallback still fails closed in production without a shared limiter. Redis settings in `.env.example` are optional for other hosts.

The fixed recipient is **info@fireballstudios.co.uk**. Name, phone, email and description are delivered as plain text, with the visitor's address as reply-to. Validation, sanitisation, origin checks, a honeypot, bounded uploads/provider responses, timeouts and idempotent retries protect the flow. Only provider acceptance shows success; inbox receipt must be confirmed separately. Errors retain the brief and offer a pre-filled email fallback. For preview tests, configure that exact HTTPS preview origin as `CONTACT_SITE_ORIGIN`.

The existing GA4 stream is `G-7RV5GM0GCF`. The owner confirmed Enhanced Measurement is off; `netlify.toml` enables this ID for production only. Local/example configuration and previews keep tracking off. The consent control additionally requires the HTTPS Fireball domain, loads Google only after acceptance, sends only known page views without query strings and supports withdrawal. See the setup guide for account settings and live verification.

Before domain cutover, verify the sender, submit a labelled test enquiry, confirm inbox receipt, review desktop/mobile playback and controls, and approve the review branch. No merge or production cutover is performed automatically.
