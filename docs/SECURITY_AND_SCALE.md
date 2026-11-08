# Security and scaling notes

Reviewed 8 November 2026. These controls reduce identified risks; they are not a penetration-test certificate or a guarantee against every attack, outage or quota limit.

## Contact protection

Both entry points reuse strict four-field Zod validation, a honeypot, exact origin checks, JSON-only POST, cancelled rejected uploads, a 16 KiB body cap and a four-second upload deadline. Delivery uses a fixed studio recipient, validated reply-to, static subject and plain text. Provider responses are bounded and private errors are not returned to visitors.

| Entry point | Rate policy and trust boundary |
| --- | --- |
| Netlify Free: `netlify/functions/contact.mts` | Declares `/api/contact`, POST, two requests per domain/IP in 180 seconds. The native wrapper uses Netlify’s handler context and its own API security headers. Preview delivery requires an explicitly configured exact HTTPS origin. |
| Generic Next.js: `src/app/api/contact/route.ts` | Optional shared Redis counter: five requests per ten minutes. Missing or failed production protection returns unavailable. Only this path normalises trusted client addresses and groups IPv6 `/64` networks. |

The native adapter does not count requests inside a function instance. Netlify applies the declared rule before invocation; Free enforcement can lag by up to ten seconds. It is not an atomic five-per-ten-minute policy, a global mail quota, or protection against every distributed attack. Free permits two code-based rules per project. Confirm rule acceptance in deploy logs, then test actual routing, delayed `429` enforcement and alternate function URLs before calling it live. Invalid rate rules do not necessarily fail a deployment. [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)

The custom path disables the native function’s default URL; the wrapper also rejects alternate paths. The generic Next.js fallback remains closed without shared protection. Do not infer permission from a client `Host`, forwarded header or `NETLIFY` flag, and never enable the memory fallback on a serverless deployment. [Function routing](https://docs.netlify.com/build/functions/configuration/)

The generic Redis path has a three-second deadline and 4 KiB response cap. Email requests have an eight-second deadline and 8 KiB acknowledgement cap. Stable HMAC-derived idempotency keys allow identical retries across instances: Resend can deduplicate the same email for 24 hours. An intentional unchanged repeat may therefore produce no second email; key rotation changes that namespace. Provider acceptance does not prove inbox delivery. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)

## Browser and analytics boundaries

Next.js pages use CSP, framing restrictions, MIME-sniffing protection, HTTPS/HSTS and restricted image sources. Native API responses set their own headers because Netlify static header configuration does not cover function responses. The static rendering strategy still needs inline hydration scripts; application escaping and safe JSON-LD serialisation remain essential. A nonce policy would require a deliberate rendering/cache change. [Netlify headers](https://docs.netlify.com/manage/routing/headers/)

GA4 is disabled unless its production/context/origin gates and explicit enable setting pass. Its consent controller waits for an accepted, successfully stored preference before creating Google’s tag queue or loading its script. Accept and reject are equally accessible; the versioned preference expires after 90 days. Storage failures keep measurement off. Withdrawal disables future application page-view measurement and clears accessible GA cookies; it cannot recall data already sent.

Only allowlisted canonical page paths/titles enter manual page-view events. Query strings, unknown paths, form values and external referrers are excluded. Advertising consent remains denied and Google signals are disabled. Turn off GA4 Enhanced Measurement before enabling this integration so automatic events do not undermine the manual allowlist. These code controls do not certify legal compliance; the operator must keep the notice and Google account settings accurate.

The car viewer is a separate opaque iframe with checked parent/source messages, explicit launch and lifecycle disposal. Its pinned Three.js/Meshopt modules need a scoped CDN and `wasm-unsafe-eval` permission on the viewer HTML only. Keep those permissions out of the main-site policy. Preserve the vehicle and wheel attribution when regenerating its assets.

## Traffic and the £0 target

The target is Netlify’s credit-based Free plan: **300 credits per month with a hard limit**, shared across the team’s projects and metered usage. Credit exhaustion pauses projects. Visitor count alone cannot establish affordability or availability; a 5,000-visitor planning assumption is not an automatic spending guard. Keep the account on Free, monitor the provider’s credit dashboard and avoid optional paid features. [Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [credit usage](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

The implementation reduces usage in several ways:

- Public pages use shared templates and static output/caching; Netlify’s OpenNext adapter may still invoke a function on a cache miss. The contact API is intentionally uncached.
- `SiteLink` disables unused route prefetch by default. Vimeo and the configurator load only after a visitor asks for them.
- The home story uses 24 views per chapter at 600 px width: twelve atlas requests and about 0.79 MB total encoded atlas data. That excludes posters, page assets and galleries. Content hashes permit immutable caching; source frames remain available for regeneration.
- Each atlas store retains at most two decoded images and uses the bounded fetch/decode machinery. The lower resolution and frame count are budget/quality tradeoffs that still need desktop/mobile review.
- The compressed configurator is about 3.32 MB as HTML, 2.48 MB with gzip and 2.46 MB with Brotli. Pinned compression preserves node names, materials and triangle counts, and restores physical coordinates before placement. Node loader/bounds checks are not a hardware WebGL or visual test.
- Release exports omit archived films and old previews. Production deploys, request volume, bandwidth, compute and other team projects still consume credits.

Use Netlify’s billing data for the hosting budget and Resend’s dashboard for its separate Free allowance. Consented GA4 page views are incomplete and must not be treated as either provider’s usage meter. Check quotas before campaigns or large releases and reassess real transfer sizes after deployment.

## Operating and release checks

Keep administration protected with multi-factor authentication, use a sending-only mail key, store credentials in server settings, avoid logging enquiry bodies and review dependency updates. CI checks types, lint, regression tests, the npm audit and the production build. The targeted minimatch override addresses GHSA-g3hv-75wg-m249 and should be removed once its upstream dependency adopts a safe range; pinned external viewer modules need review separately from npm’s dependency audit.

Deployed Netlify routing/rate rules, real enquiry receipt/replies, GA4 account settings and live consent events still require verification. Browser/mobile and WebGL appearance also need review. Follow the [publishing guide](EMAIL_AND_PUBLISHING.md), preserve existing mailbox MX records during any DNS change, and record actual evidence in [review results](REVIEW_RESULTS.md).

## Development tooling

The full npm audit currently reports no known vulnerabilities. ESLint 9.39.5 is retained because the lint plugins bundled with the current Next.js config do not yet declare ESLint 10 compatibility. ESLint 9 reports that it is out of support; this is a development-tool maintenance constraint, not a production runtime dependency. Review the Next.js lint-config/plugin updates through Dependabot before upgrading the linter.
