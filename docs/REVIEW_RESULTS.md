# Revision checks — 8 November 2026

## Completed changes

- Interactive Residence offers only original stills 3.4 and 3.5, plus its film, on Home and Projects.
- Small interface text is larger and form inputs use 16px. Shared gallery/dialog logic and one chapter-order manifest replace duplicated code; eight unreachable legacy modules were removed.
- Contact requests and provider responses have bounds, deadlines, sanitisation, origin validation, honeypot checks and idempotent retries. Netlify has a native custom-path rate rule; the generic API remains closed without its own production protection.
- SEO topics, canonicals, social images, breadcrumbs/schema and sitemap share their manifests. Relevant legacy URLs redirect; previews are noindex.
- The default scroll media is 788,652 bytes across 12 hashed WebP atlases, down from approximately 10.94 MB of full sequences. Original frames and source films are retained.
- The deferred car viewer is 2,475,653 bytes with local gzip, down from 10,894,247 bytes. Model structure, material/triangle counts, bounds and attribution are checked. Runtime placement restoration handles quantisation transforms.
- GA4 reuses G-7RV5GM0GCF. The owner confirmed Enhanced Measurement is off. Production configuration is enabled, with domain/context/consent gates; previews remain disabled.
- Netlify configuration, media-budget CI checks, dependency updates, a file guide, email/DNS instructions and the usage forecast are included.

## Verification performed

`npm run type-check`, `npm run lint`, all **97 tests**, `npm run check:media-budget` and the **Next.js 16.4.5 production build** pass. The full dependency audit reports **zero known vulnerabilities**, including development dependencies. ESLint's current compatibility/support constraint is recorded in the security guide.

Local production HTTP checks pass for **18 pages, 20 internal link targets, 39 anchors, 29 rendered image URLs, 12 atlas files, 18 sitemap entries and 65 JSON-LD blocks**. Initial HTML contains no media iframe or local video player. The residence has exactly two gallery figures. Image optimisation, immutable atlas headers, the isolated viewer's framing/WASM policy, compact form, legacy redirects, genuine missing pages and API rejection/unavailable responses pass.

The native Netlify build/deploy succeeds with adapter `@netlify/plugin-nextjs@5.16.6`. Its generated function manifest assigns `/api/contact` POST to the native function at priority 10, ahead of the priority-0 OpenNext catch-all. The manifest contains the two-per-IP/domain/180-second sliding-window rule.

The authorised Netlify account is **Free**, with **300 monthly credits**, **no payment method**, and **automatic top-ups disabled**. No production deploy or domain change has been made. The draft initially requires Netlify owner login, so unauthenticated HTTP requests return 401 rather than reaching the application. Live route/rate enforcement checks remain pending preview access.

The earlier clean GitHub review commit's Website checks workflow passed. The final refresh must receive its own CI result after pushing. Old GitHub `main` and Pages publication remain intact.

## Review links

- Netlify project: https://app.netlify.com/projects/fireball-studios-web
- Initial draft: https://6af0e5c9bf774e0797a3515d--fireball-studios-web.netlify.app
- GitHub review branch: https://github.com/infofireballstudios-369/fireball-studios-website/tree/codex/security-seo-launch-20261108

The draft is for review; it is not the production domain. See the publishing guide for preview access and the final Git integration/cutover.

## Still requires external verification

Browser access is unavailable. Desktop/mobile appearance, actual keyboard interaction, Vimeo playback, forward/reverse scrubbing and live WebGL controls require browser review. Offline Three.js loading and bounds comparisons do not prove the viewer's browser appearance.

No Resend account, verified sender or email credentials are configured. No real enquiry was sent. Add `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` securely in Netlify, verify the sending domain, then check provider acceptance **and** actual receipt/reply-to at info@fireballstudios.co.uk. A missing setup returns an honest unavailable state and an email fallback.

Live Netlify custom-path handling, delayed rate enforcement, default-function bypass rejection, actual transfer compression and Google event delivery need deployment/browser checks. GA4 tests use mocks; the owner's Enhanced Measurement confirmation is not a browser event-delivery test.

The existing domain still points to the old site. Netlify GitHub App repository permission, an approved source merge, production deployment, verified email and project-specific 123 Reg DNS changes remain part of the launch procedure. Preserve mailbox MX/TXT records and rollback values.

The 5,000-visit baseline is a planning forecast of 215 credits before compute, other pages, bots and additional traffic. Five thousand 3D launches would raise it to approximately 470 credits and exceed Free. Netlify's hard cap prevents automatic paid overage but can pause the site; no unlimited capacity or absolute security guarantee is claimed.
