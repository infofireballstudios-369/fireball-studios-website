# Fireball Studios

A Next.js 16 App Router website for 3D visualisation, animation and interactive experiences. TypeScript, Tailwind CSS, GSAP and the Dark Studio theme support property, automotive, furniture, products and creative concepts.

## Start here

- [File and editing guide](docs/PROJECT_GUIDE.md)
- [Email authentication and GitHub/domain publishing](docs/EMAIL_AND_PUBLISHING.md)
- [Security and scaling notes](docs/SECURITY_AND_SCALE.md)
- [SEO/AEO and keyword/topic management](docs/SEO_GUIDE.md)

## Review branch and preview

The website now has a dedicated Git repository. The baseline is on main; this revision is on codex/vimeo-portfolio-refresh. The local source history preserves large original videos. GitHub publishing uses a clean release export and a separate branch in the existing website repository; see the publishing guide before pushing.

~~~sh
git switch codex/vimeo-portfolio-refresh
npm ci
npm run dev
~~~

Open http://localhost:3000. Use Node.js 24. Next.js fetches the configured Google fonts at build time and serves them locally.

~~~sh
npm run type-check
npm run lint
npm test
npm run build
npm start
~~~

Tests mock email delivery and do not send enquiries. Browser review is separate from compilation and HTTP checks.

Run the checks above after changes; GitHub CI runs the same checks and a dependency audit. The latest verification results are reported with each revision. Browser access was unavailable during preparation, so desktop/mobile appearance, actual Vimeo playback and live WebGL controls still need browser review.

## Content and routes

| Route | Content |
| --- | --- |
| / | Scroll story 3 → 6 → 5, services, featured sources 3 and 5, pricing and FAQs |
| /projects | Six portfolio entries with category filters, image galleries and deferred film playback |
| /projects/[slug] | Project film or interactive configurator, brief, gallery and credits |
| /industries | Related property, architecture, automotive and furniture/product work |
| /about | Studio approach and six-step creative process |
| /blog, /blog/[slug] | Searchable insights and the spaceship concept article |
| /contact | Name, phone, email and project description form |
| /privacy, /terms | Website notices |
| /sitemap.xml, /robots.txt | Search discovery |

Project data lives in src/lib/projectsData.ts; source asset IDs are distinct from portfolio IDs. Featured projects are selected explicitly by source 3 and 5. Real Estate contains sources 1, 3 and 4; Architecture contains 2; Product Design contains 5. Automotive contains the car configurator. Source 6 is the original spaceship concept and belongs to the home story and blog only.

Existing project URLs remain available. The former /blog/automotive-visualisation-brief URL permanently redirects to /blog/spaceship-concept-visualisation. Articles, process copy, industries, links and metadata use the revised content.

The six process stages are Understand → Design & Model → Design Review → Visualise → Review & Refine → Deliver. Portfolio entries are labelled as studio studies; client results and qualifications have not been invented.

## Vimeo playback

src/lib/assetManifest.ts is the source of truth for hosted films and frame counts.

| Source | Vimeo video |
| --- | --- |
| 1 | https://vimeo.com/1243948791 |
| 2 | https://vimeo.com/1243948789 |
| 3 | https://vimeo.com/1243951425 |
| 4 | https://vimeo.com/1243948790 |
| 5 | https://vimeo.com/1243948881 |
| 6 | https://vimeo.com/1243948923 |

VimeoPlayer serves a local poster first. An iframe is mounted only after an explicit playback action, with a direct Vimeo link and loading/error fallback. The portfolio grid opens one film at a time. No Vimeo SDK, player iframe or video stream loads in the initial page HTML. The iframe uses dnt=1 and retains the origin referrer needed for domain-restricted embeds.

All six links returned successful Vimeo oEmbed metadata during the revision. Actual playback and domain privacy should also be checked in the deployment browser. If a Vimeo privacy setting changes, permit the preview or production hostname in the Vimeo account as appropriate.

Original local films and older previews are preserved as source assets. They are no longer used for visitor-facing playback. Keeping an unused source file in public does not cause the browser to download it automatically.

## Scroll and galleries

The homepage remains a local WebP canvas sequence rather than a Vimeo scrubber:

| Chapter | Frames | Preparation |
| --- | --- | --- |
| Property introduction | /frames/3/3.1.webp to 3.96.webp | Existing continuous move |
| Spaceship concept | /frames/6/6.1.webp to 6.96.webp | 7.60–12.933 seconds of source 6, 18fps |
| Furniture/product | /frames/5/5.1.webp to 5.96.webp | Existing continuous move |

Sequence 6 comes from ../Projects/Edited-2/6.mp4.mov; the file is read in its original format. Its selected segment avoids the film’s hard cuts. The three active sequences total approximately 11 MB compressed.

GSAP ScrollTrigger maps native scroll progress to frame indices. The canvas preserves aspect ratio, caps pixel density, prioritises the current frame and limits decoding to two concurrent frames. Compressed images preload progressively, while decoded-image caches and pending work remain bounded. Reduced-motion and short viewports use a static layout. Failed image loading offers a still and a hosted-film link.

Original gallery stills are isolated in public/gallery/1 through /5. Interactive Residence now uses only 3.4 and 3.5 on Home and Projects, with its film available from both. Gallery cards and film dialogs share their implementations. Animation frames in public/frames are never treated as original gallery stills. Project 5 has two genuine gallery images, converted from its original PNG files.

Reproduce derived media with FFmpeg and the original Projects folder:

~~~sh
FFMPEG_PATH=/absolute/path/to/ffmpeg node scripts/prepare-story-sequences.mjs ../Projects --sequences=6
~~~

The script imports gallery originals from Projects/Images. scripts/prepare-media.mjs retains the earlier preview preparation workflow. Keep originals intact and frame counts aligned with the files.

## Automotive configurator

/projects/car-configurator launches public/experiences/car/fireball-car-configurator2.html only on request. Its approximately 14.5 MB model payload is absent from the initial homepage and portfolio HTML. The iframe runs in an opaque sandbox, validates lifecycle messages, pauses when hidden and releases resources on close. A standalone link provides an alternative launch route.

The viewer uses pinned Three.js 0.170.0 modules from jsDelivr. Only its own HTML response receives the required CDN and framing CSP permissions; other routes keep their existing restrictions. Its model data and original CC BY 4.0 credits are preserved, with visible attribution on the project page too.

The small car poster is an offline render of the actual supplied model with simplified lighting and source wheels; it is not a screenshot of the live interface. Regenerate the integration and poster from the source HTML with:

~~~sh
node scripts/import-configurator.mjs
node scripts/render-configurator-poster.mjs
~~~

Both scripts accept the source location documented within them. The original source is ../Projects/Edited-2/fireball-car-configurator2.html.

## Contact delivery

Copy .env.example to .env.local for local development, or set the same values in your server environment. Never expose credentials through NEXT_PUBLIC variables or commit them.

- RESEND_API_KEY: the email delivery API key.
- CONTACT_FROM_EMAIL: a bare sender address on a verified Resend domain.
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN: shared production rate limiting.
- CONTACT_SITE_ORIGIN: an optional extra HTTPS staging origin.
- CONTACT_TRUST_PROXY=true: only where a proxy replaces incoming client IP headers; Vercel is detected automatically.
- CONTACT_ALLOW_MEMORY_RATE_LIMIT=true: an explicit alternative for one persistent server, not multiple instances or serverless hosting.

The fixed recipient is info@fireballstudios.co.uk. The visitor’s email is used as reply-to, and their name, phone and description appear in the text email. The shared Zod schema, sanitisation, origin checks, 16 KiB body limit, honeypot, timeouts and rate limiting protect the endpoint.

Only provider-confirmed acceptance produces success. Provider acceptance does not prove inbox receipt. Missing configuration returns an unavailable response; the form retains the brief and offers a pre-filled email draft including the phone number. Prices remain available on enquiry, with the comparable-quote price-match promise in surrounding copy.

No delivery or Redis credentials were present during this revision, so live email delivery could not be tested. Configure the four required values above and verify a labelled test enquiry reaches the studio before release.

## Release checks

Security headers include CSP, HSTS in production, MIME-sniffing protection, referrer policy, permissions policy and framing restrictions. Static Next.js hydration requires the existing inline-script allowance; the imported viewer has its own narrowly scoped policy.

Before merging, review the branch in desktop and mobile browsers, including Vimeo playback, reverse scroll scrubbing, configurator options and contact error/success states. Confirm internal links, the blog redirect and email delivery. This revision changes the local repository only and leaves main available for comparison.
