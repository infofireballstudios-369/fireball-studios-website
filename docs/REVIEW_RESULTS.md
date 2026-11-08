# Revision checks — 8 November 2026

## Implemented

- Interactive Residence has only gallery stills 3.4 and 3.5, with its film available on Home and Projects.
- Ordinary small text is larger; form controls use 16px. The brand's small secondary wordmark remains part of the logo treatment.
- Shared film dialog, one project gallery source, one homepage chapter-order source, and removal of eight unreachable legacy modules and duplicate project data.
- Request/provider deadlines and size limits, duplicate-delivery protection, stronger rate-limit identity handling and bounded frame-store recovery.
- Central SEO topic management, accurate per-page social metadata, matching breadcrumbs/schema, preview indexing protection and relevant legacy URL redirects.
- File guide, operational security notes, email authentication instructions, clean GitHub export, CI and automated dependency-update configuration.

## Verification performed

TypeScript, ESLint, all 65 tests and the Next.js 16.4.5 production build pass. The complete npm dependency audit reports zero known vulnerabilities, including development packages.

HTTP checks passed for 18 pages, 20 internal link targets, 39 anchor references, 18 sitemap entries and 65 JSON-LD blocks. The initial pages contain no media iframes or local video players. Asset responses, image optimisation, restricted external image URLs, the compact form and API rejection/unavailable responses pass.

The Interactive Residence detail page renders exactly two gallery figures, and Home offers its film action. Relevant old .html URLs redirect correctly; removed engineering services return a genuine 404. The standalone viewer is noindex. A small local check completed 100 read-only page requests at concurrency 10 without an HTTP error; this does not establish production capacity.

## Still requires external verification

Browser access was unavailable. Desktop/mobile layout, real keyboard interaction, Vimeo playback, reverse scrolling and live WebGL controls therefore need browser review on the hosting preview.

RESEND_API_KEY, CONTACT_FROM_EMAIL, UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured. No real test email was sent. Configure them securely, verify the sender domain and confirm receipt in info@fireballstudios.co.uk before launch.

GitHub authentication works. The existing GitHub repository currently serves the old site through Pages. The new app needs a server-capable host, a chosen hosting plan/account and the provider's exact DNS values before domain cutover. Original large media and local history are preserved; the clean export excludes archived videos rather than rewriting that history.
