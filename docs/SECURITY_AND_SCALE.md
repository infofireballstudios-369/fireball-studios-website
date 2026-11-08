# Security and scaling notes

Review date: 8 November 2026. This is a code and configuration review, not a penetration-test certificate or a promise that attacks or outages are impossible.

## Controls in the application

| Area | Measures |
| --- | --- |
| Enquiry input | Shared strict Zod schema, length/type limits, single-line names, plain-text sanitisation, validated email and phone, honeypot |
| Request abuse | Exact origin allowlist, JSON-only POST, rejected-body cancellation, 16 KiB request cap, four-second upload deadline |
| Rate limiting | Atomic Redis counting/expiry, five requests per ten minutes, fail closed in production when protection is unavailable |
| Client identity | Trust forwarded headers only on a recognised platform or an explicitly trusted proxy; normalise IPv4 and group IPv6 addresses by /64 |
| Delivery | Fixed studio recipient, validated reply-to, static subject, plain text, bounded provider response and eight-second delivery deadline |
| Duplicate retries | Provider idempotency key derived from the sanitised email and the server API key; identical retries are deduplicated across instances |
| Provider requests | Three-second Redis deadline, 4 KiB Redis response cap, 8 KiB email acknowledgement cap, no redirects or sensitive provider errors returned to visitors |
| Browser | CSP, HSTS in production, MIME-sniffing protection, restricted framing and permissions, external image sources disabled |
| Automotive viewer | Deferred model download, opaque sandbox, validated parent/source messages, separate pinned-CDN policy and lifecycle disposal |
| Preview indexing | Metadata and HTTP noindex directives for previews; standalone viewer is not indexed |
| Supply chain | Locked npm dependencies, pinned GitHub Action revisions, weekly Dependabot proposals and CI validation/audit |

The static Next.js rendering strategy needs the existing inline-script CSP allowance. This reduces protection against an injection that bypasses application escaping. React output encoding, safe JSON-LD serialisation and the absence of untrusted HTML rendering remain essential. A nonce-based policy would need a deliberate change to the rendering/cache strategy rather than a header-only edit.

The lint dependency tree previously contained the minimatch glob-amplification advisory GHSA-g3hv-75wg-m249. A targeted override supplies minimatch 11.0.1 or later only to typescript-estree; other dependency APIs are not globally overridden. Next.js and its ESLint configuration were updated together within version 16. The override should be removed when the upstream dependency adopts a patched range. Type checking, lint and the build verify compatibility.

## Scaling design

- Public content is generated as static pages and can be served by the hosting CDN. The contact API is the principal server workload.
- Project and article templates share typed manifests. Add content entries rather than copying route implementations.
- Vimeo handles normal film streaming. No iframe, SDK or film stream is loaded before a visitor requests playback.
- The 14.5 MB car viewer is fetched only on launch, pauses when hidden and is destroyed when closed. Its size and GPU requirements still matter on slower phones.
- Scroll imagery uses capped pixel density, two decode slots, a bounded waiting queue and a bounded decoded cache. Each store has cancellation, fetch deadlines and one bounded retry for the requested frame. Evicted chapters release their resources and reset readiness.
- Production rate limiting must use shared Redis for multiple instances. The optional memory limiter is for one persistent server only; its capacity is bounded and expiry cleanup is incremental.
- Release exports omit approximately 448 MB of unused source videos as well as old previews and motion assets. Originals remain in the local source library and Git history.

These measures reduce bottlenecks; they do not establish an unlimited traffic capacity. Test the selected hosting plan, CDN, email quota, Redis service and spend limits against real demand. Local checks do not model a distributed denial-of-service attack or provide a production load guarantee.

## Production responsibilities

Use the host's managed HTTPS, DDoS protection and appropriate WAF rules. Restrict hosting/GitHub/Resend administration with multi-factor authentication. Keep secrets in encrypted server settings, use a sending-only email key, rotate compromised keys and review automated update proposals. Configure alerts for provider failures, quota/budget limits and elevated rejected requests. Avoid logging enquiry bodies or unnecessary personal details.

The five-request limit is shared by people behind the same trusted client address or IPv6 /64. If traffic patterns require changing it, update constants and tests together. Identical email retries can be deduplicated for Resend's documented 24-hour window; an intentional repeat with an unchanged brief may not produce another email. API-key rotation changes the idempotency namespace.

Before launch, verify real enquiry delivery and replies, desktop/mobile layouts, Vimeo playback and WebGL controls. Browser automation was unavailable in this environment. Check the deployment guides for the hosting and DNS steps; changing website DNS must not break the existing mailbox MX records.

## References

- [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- [Resend idempotency contract](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Next.js CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy)
