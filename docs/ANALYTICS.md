# Optional GA4 analytics

This static website uses basic consent mode: the Google tag stays unloaded until the visitor accepts analytics. Accept and reject have equal prominence. A footer **Analytics preferences** button lets visitors revisit their choice without blocking use of the website. The separate Netlify enquiry capture has no analytics integration. Its Google reCAPTCHA security check may load independently; the analytics choice does not control that anti-spam service.

## Existing account

| Setting | Value |
| --- | --- |
| GA account | `410359815` |
| GA4 property | `556950277` |
| Web measurement ID | `G-7RV5GM0GCF` |

The measurement ID is public configuration. This integration does not need a Google API key, service-account file or private token. Keep account credentials out of the website and repository.

The owner confirmed that **Enhanced Measurement was switched off on 8 November 2026**. Keep it off at **Admin → Data streams → the web stream → Enhanced measurement** when maintaining the stream. The current preparation did not reinspect the Google account. Automatic measurement can collect search parameters, outbound links and form interactions; it would undermine the application's manual page-data restrictions. [Google’s enhanced measurement guide](https://support.google.com/analytics/answer/9216061)

## Build settings

| Public setting | Meaning |
| --- | --- |
| `ENABLE_ANALYTICS=true` | Explicitly enable the eligible production integration |
| `GA_MEASUREMENT_ID=G-7RV5GM0GCF` | Select the existing web stream |
| `SITE_URL=https://fireballstudios.co.uk/` | Approved production canonical URL |
| `NOINDEX=false` | Allow indexing; previews remain ineligible |

Only the exact enable value `true` is accepted. Development/noindex builds, non-HTTPS URLs, unexpected hosts and nonstandard ports do not enable analytics. The approved hosts are `fireballstudios.co.uk` and `www.fireballstudios.co.uk`. Runtime requires both the browser origin and configured canonical origin to be approved HTTPS brand origins; they need not be identical. Canonical URLs may use the apex while a browser visits `www`. A GitHub project-path preview or localhost cannot activate the production tag by copying these settings.

The generator includes configuration and preference controls only on the 18 primary eligible pages. Redirects, the error page, the car viewer and Netlify capture do not initialise measurement. Public settings are build-time values: rebuild after changing them. `ENABLE_ANALYTICS=false` or omission disables the integration in the next deployed artifact; it cannot remove scripts from already-open pages or erase earlier Google records.

## What the controls do

- The visitor's accepted or rejected preference is stored locally in that browser for 90 days. Invalid, expired or unavailable storage keeps measurement off. The preference does not enable advertising.
- After acceptance, the controller loads one Google Analytics tag and sends a manual visit for an approved page. Google may also emit standard session/engagement events after consent. [Automatically collected events](https://support.google.com/analytics/answer/9234069). Automatic page views are disabled with `send_page_view: false`; Enhanced Measurement must also remain off. [Google’s manual page-view guide](https://developers.google.com/analytics/devguides/collection/ga4/views)
- Page titles and locations come from the generated allowlist, with no URL query parameters, UTM parameters, fragments or form values. A recognised same-site referrer becomes an approved canonical page URL; an approved external referrer becomes its origin only. Unknown referrers are omitted. This deliberately limits campaign and referral detail.
- Google still processes ordinary browser/device and service information after consent. The integration does not enable advertising features, Google signals or advertising consent.
- Analytics cookies are host-only, expire within 90 days and do not refresh their expiry on each visit. Normal page navigation preserves accepted cookies. Rejecting or withdrawing disables future measurement and removes accessible Analytics cookies. Storage failures, invalid preferences and expiry also stop measurement. Withdrawal cannot recall data already sent.
- Script/network/storage failures leave the website usable and report a concise status. The panel is nonmodal, never locks scrolling and does not move focus on its first appearance. Explicitly opening preferences moves focus into the panel; closing or choosing returns focus to the opener.

Basic consent mode blocks the Google tag before consent rather than sending consent-denied measurement pings. The privacy page explains this integration and links to Google's privacy policy. These controls do not certify legal compliance; keep the notice and account settings aligned with actual operation. [Google’s basic consent-mode guide](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)

## Where to edit

| Responsibility | Source |
| --- | --- |
| Production build eligibility | [analytics-settings.ts](../src/lib/analytics-settings.ts), [build-config.ts](../src/lib/build-config.ts) |
| Generated page configuration and scoped CSP | [generate-pages.ts](../scripts/generate-pages.ts) |
| Hidden semantic panel and footer button | [analytics.ts](../src/templates/analytics.ts) |
| Consent rules and safe page/referrer payloads | [analytics.ts](../src/lib/analytics.ts) |
| Browser adapter and preference controls | [analytics-consent.ts](../src/components/analytics-consent.ts) |
| Privacy wording and panel styling | [pages.ts](../src/templates/pages.ts), [site.css](../src/styles/site.css) |

Do not paste Google's usual inline snippet into templates, add preconnects to Google before consent, or place Analytics on the isolated form host. Use the shared controller so saved preferences, script loading and teardown stay consistent.

## Verification after an approved release

Run `npm run type-check`, `npm test` and `npm run build`. Inspect both a disabled preview and an eligible production artifact. Automated tests check eligibility, payload restrictions, choice handling, expiry, failure paths and the generated controls; they cannot prove live reception by Google.

In a real browser on the production domain:

1. Start with fresh site storage. Check that no Google Analytics tag or Analytics collection request occurs before a choice. Reject, navigate to another page and check again.
2. Open preferences from the footer and accept. Check for a single tag load, the correct measurement ID and an approved page view. Review the request's page/referrer fields: no raw query string, URL fragment or enquiry details should appear.
3. Have the account owner check **Realtime** in property `556950277` after that accepted visit. Browser dispatch is not evidence of a received event; record the owner's observation separately. Blocking extensions, processing delays and consent choices affect what appears.
4. Withdraw, navigate and confirm that future collection stops and accessible GA cookies disappear. Test a blocked tag, denied browser storage, mobile/keyboard controls and a return through the browser's Back cache.

The browser host and Google administration were unavailable during preparation. Live Realtime receipt and visual browser checks remain unverified. Analytics observes only consenting, unblocked visits; it does not measure every visitor or the host's billing usage. Neither Analytics nor metadata changes guarantee indexing, rankings or first-page search placement.
