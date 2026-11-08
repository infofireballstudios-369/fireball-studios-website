# Email and publishing on the £0 stack

The confirmed setup is **Netlify Free + Resend Free + the existing Google Analytics 4 property**. Keep the domain and mailbox with their existing providers. The £0 target covers the new hosting, enquiry delivery and analytics services; existing domain and mailbox renewals remain separate.

The [public review preview](https://review--fireball-studios-web.netlify.app) is deployed on Netlify. Production and Deploy Preview visibility are both Public, but no production deployment has been published. The existing GitHub `main` branch and website DNS still serve the old site. Resend setup, real email delivery and the authorised production/domain cutover remain outstanding.

## Free limits and operating rules

Current credit-plan allowances, checked on 8 November 2026:

| Service | Included allowance | What consumes it |
| --- | --- | --- |
| Netlify Free | 300 shared credits per month | 15 per successful production deploy; 20 per GB bandwidth; 2 per 10,000 web requests; 10 per GB-hour compute |
| Resend Free | 3,000 transactional emails per month, maximum 100 per day | Each accepted enquiry notification uses an email; this site sends no visitor autoresponder |
| GA4 Standard | No subscription charge | Consented visitor reporting; do not enable Analytics 360 or paid exports |

Netlify notifies at 50%, 75% and 100% usage. Its Free hard cap pauses projects when credits run out; all projects on the account can be affected. Preview deployment creation costs no credits, but preview traffic, assets and compute still consume the shared allowance. Stay on Free: do not upgrade, purchase credits or enable recharge. [Netlify pricing](https://www.netlify.com/pricing/), [credit calculation and limits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).

Keep Resend on Free without paid add-ons or pay-as-you-go. GA4 requires no Google Cloud billing account, BigQuery export or Google Ads connection. [Resend pricing](https://resend.com/pricing), [Google Analytics](https://marketingplatform.google.com/about/analytics/).

**There is no always-online or 5,000-visitors guarantee on this budget.** Scroll imagery, gallery images and configurator downloads use bandwidth, and repeated requests, bots and production deployments use credits too. Watch the Netlify usage dashboard and alert email address. Batch approved changes into fewer production deployments; use previews for review. If the cap is reached, accept the pause until the allowance resets rather than activating a paid plan. Vimeo-hosted film bytes are separate from Netlify's locally served assets.

## Set up enquiry email without moving the mailbox

Visitors need no account. The server authenticates to Resend; this is separate from the mailbox receiving enquiries.

1. Confirm that the existing `info@fireballstudios.co.uk` mailbox receives an ordinary email.
2. In Resend Free, add a sending subdomain such as `notifications.fireballstudios.co.uk`.
3. Open the DNS service that actually hosts the domain records. If 123 Reg is authoritative, use its DNS management screen. Add the exact DKIM, SPF and return-path records displayed by Resend, using the supplied hostnames and values. Wait for verification.
4. Preserve the root-domain MX records and existing mailbox authentication records. Do not enable Resend receiving or replace the mailbox MX records merely to send enquiries. A requested MX record on a dedicated return-path subdomain is separate; use its exact hostname.
5. Create a Resend key with **Sending access**, restricted to the verified sending domain. Keep email open/click tracking off.
6. In the Netlify project's environment-variable settings, enter `RESEND_API_KEY` and `CONTACT_FROM_EMAIL`. Use a bare sender address on the verified domain, for example `website@notifications.fireballstudios.co.uk`. These are the only required email configuration values for the native Netlify route.
7. Make the values available to the production function runtime. Prefer the Functions scope where available. Keep credentials out of untrusted PR/preview contexts, build logs, screenshots, chat and GitHub. Never use a `NEXT_PUBLIC_` prefix for the API key.
8. Redeploy after changing environment values. Submit one clearly labelled test enquiry and inspect its Resend status, actual mailbox receipt, spam placement and reply-to behaviour.

[Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), [restricted API keys](https://resend.com/changelog/new-api-key-permissions), [Netlify environment-variable settings](https://docs.netlify.com/build/environment-variables/overview/).

The recipient is fixed in server code as `info@fireballstudios.co.uk`; the visitor's validated email becomes reply-to. The plain-text message contains the name, phone number and project description. A `202` response means the provider accepted the message, not that it reached the inbox. Check delivery/bounce status and mailbox receipt separately. Resend deduplicates identical retries within its documented 24-hour idempotency window. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Contact protection and environment values

Netlify serves `/api/contact` through [netlify/functions/contact.mts](../netlify/functions/contact.mts), with a native limit of two requests per IP/domain in 180 seconds. The handler retains input validation, bounded bodies, same-origin checks and fixed-recipient delivery. The public review preview has returned the expected `400` for invalid input, `503` for a valid enquiry while email is unconfigured, `404` at the default function URL, and a platform-generated `429` after the rate limit. These checks verify rejection behaviour, not email delivery. Netlify documents an enforcement delay of up to ten seconds; the rule does not guarantee that a distributed attack cannot exhaust the free email quota. [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

| Variable | Netlify use |
| --- | --- |
| `RESEND_API_KEY` | Required secret; domain-restricted sending key |
| `CONTACT_FROM_EMAIL` | Required verified sender address |
| `CONTACT_SITE_ORIGIN` | Optional exact HTTPS origin for an explicitly trusted preview; no path, wildcard or trailing slash |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Existing public ID `G-7RV5GM0GCF`; not a secret |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Production is configured `true` following the owner's Enhanced Measurement confirmation; previews remain `false` |
| `SITE_NOINDEX` | `true` for previews; `false` for the live production deployment |

No Redis account is required for this Netlify deployment. The generic Next.js route used on other hosts still needs distributed protection through `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; do not enable the memory-limiter override on serverless hosting.

Preview enquiry delivery is disabled unless an exact `CONTACT_SITE_ORIGIN` is deliberately configured. A trusted preview test also requires email values restricted to that trusted deployment context. `DEPLOY_PRIME_URL` can identify the preview origin during a build, but do not treat an incoming Host or Origin header as authorisation and do not allow `*.netlify.app`. Untrusted pull-request previews must not receive the Resend key. Native production delivery can recognise Netlify's trusted site origin, while the public Fireball domains remain allowed.

For local work, copy `.env.example` to `.env.local` and fill it privately. Never commit real credentials to either GitHub or `netlify.toml`.

## Reuse the existing GA4 stream

Keep the existing property and web stream `G-7RV5GM0GCF`; this preserves its existing reporting history. No new property, API secret or paid Google product is needed. Hosting changes do not require a new measurement ID when the domain stays the same.

Before setting `NEXT_PUBLIC_ENABLE_ANALYTICS=true`, an account Editor must open **GA4 Admin → Data collection and modification → Data streams → the existing web stream** and switch **Enhanced measurement OFF**. Confirm automatic history page views, forms, outbound links, site search, scrolling, video and downloads are off. Leave Google Signals, user-provided data, advertising personalisation, remarketing and Ads linking disabled. The code sends controlled manual page views; account-driven automatic events would undermine that control. [Google enhanced measurement settings](https://support.google.com/analytics/answer/9216061?hl=en).

The owner has confirmed Enhanced Measurement is off, and the existing ID is enabled in production configuration. Previews retain the false override. Analytics still requires a production deployment, an HTTPS Fireball domain and the visitor's explicit acceptance, so the public Netlify preview does not collect it. See [SEO_GUIDE.md](SEO_GUIDE.md#analytics-and-consent) for consent, retention and validation details. The remaining account settings and real event delivery need verification at the authorised launch.

## Prepare GitHub and Netlify without replacing the live site

The repository is `infofireballstudios-369/fireball-studios-website`. Its existing `main` branch contains the old static site served by GitHub Pages. Pages cannot run the new contact endpoint; Netlify's Next.js adapter runs this replacement. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

The local archive includes original videos above GitHub's regular-file size limit. Export only application source and runtime assets into a new empty folder, then apply that export to a clean review branch based on the existing GitHub repository:

~~~sh
node scripts/export-release.mjs /absolute/path/to/a/new-empty-directory
~~~

The exporter excludes credentials and archived media, checks file sizes and creates `RELEASE_MANIFEST.json`. Preserve the original local archive and history. Do not force-push or rewrite `main`. After migration, use the clean GitHub clone for ordinary updates. [GitHub file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

1. Review the prepared branch/pull request and checks. Keep the current Pages site and `main` intact.
2. Use the existing `fireball-studios-web` project; do not create a duplicate. Confirm **Free** without paid add-ons. A manual review preview is available before Git integration. To connect GitHub later, open **Project configuration → Developer settings → Continuous deployment → Repository → Link repository**, and authorise the Netlify GitHub App for this repository only. Stop automatic builds while `main` still contains the old site; after the approved merge, select `main` and enable builds. The CLI login alone does not grant GitHub repository access. Do not run plain `netlify init`: it selects the repository default branch, which is still the old site. Use the repository root, Node.js 24 and **`npm run build:netlify`**; `netlify.toml` selects `.next` and the functions directory. Do not choose `out` or static export.
3. Use the prepared review branch and [public preview](https://review--fireball-studios-web.netlify.app) for verification. Both Production and Deploy Preview visibility are already Public; no login or visibility change is required to view the preview. Its actual HTML is noindex, contains no enabled GA4 configuration and exposes an empty sitemap. Noindex is not authentication. Leave email disabled unless deliberately testing a trusted preview as described above.
4. Test mobile/desktop layouts, keyboard controls, deferred Vimeo playback, forward/reverse scroll animation and the configurator. On a trusted test deployment, verify `/api/contact`, real inbox receipt and platform rate limiting. Check Vimeo's allowed domains if a film refuses the preview hostname.
5. Publish production only after the source is approved and the merge/launch is authorised. Prepare production email values and preserve the old Pages deployment during the transition. Production-only analytics is configured, but live consent/event checks remain. Each successful production deploy uses 15 credits, so avoid repeated speculative production builds. Public visibility alone does not publish a production deployment or change the domain.

`npm run build:netlify` first runs `scripts/prepare-netlify-headers.mts`, which generates the ignored `public/_headers` file from the shared security policy, and then runs `npm run build`. This gives Netlify-served static files, including the standalone car viewer, the intended CSP and preview indexing headers. Next.js header rules alone did not cover that static hosting path. Keep this wrapper as the Netlify build command and check the deployed static viewer response after rebuilding.

## Move the domain only after the replacement is verified

For the authorised launch, approve and merge the replacement, enable its verified Netlify production build, and confirm that deployment before changing website DNS. Preserve the existing Pages deployment and rollback records during this transition. None of these production or DNS steps has been completed by publishing the review preview.

1. In Netlify **Domain management**, add the existing `fireballstudios.co.uk` domain and `www.fireballstudios.co.uk`. Keep the apex as the primary domain to match this site's canonicals and redirect `www` to it. Choose external DNS so the existing DNS provider remains in place.
2. Read Netlify's project-specific **Pending DNS verification** instructions. In 123 Reg, or the actual authoritative DNS service, change only the relevant website A/AAAA/ALIAS and `www` CNAME records to the supplied values. Preserve existing records for rollback. Do not change nameservers or mailbox MX/TXT records as part of this website move.
3. Wait for DNS and HTTPS verification, then test both public domains, the `www` redirect, old URL redirects, `/sitemap.xml`, `/robots.txt`, media and another real enquiry. Do not cancel a 123 Reg service that also supplies the mailbox.
4. Once the new domain serves the verified replacement, remove the old GitHub Pages domain assignment/CNAME and disable obsolete Pages publication as appropriate. Preserve the old source and DNS values for rollback.
5. Submit the canonical sitemap in the existing Google Search Console and Bing Webmaster Tools accounts. Check production consent and event delivery on the real domain using the existing GA4 stream.

Use the values shown for this Netlify project, not an IP address copied from an old tutorial. [Netlify domain assignment](https://docs.netlify.com/manage/domains/manage-domains/assign-a-domain-to-your-site-app/), [external DNS configuration](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/), [123 Reg DNS guidance](https://www.123-reg.co.uk/support/domains/how-do-i-point-my-domain-name-to-an-ip-address/).

Relevant old `.html` URLs redirect to corresponding new routes. Removed services without an accurate replacement should return a genuine missing-page response, rather than inventing a service or redirecting every missing page to Home.

If account access is missing, complete each provider's secure login flow. Never send passwords, personal access tokens or email API keys in chat. A GitHub push alone does not deploy this site, verify email or change the domain.

## Current setup status

On 8 November 2026, the owner confirmed that Enhanced Measurement is off. `netlify.toml` therefore enables the existing GA4 ID for production builds; preview contexts still override the flag to false, and the browser still requires the HTTPS Fireball domain and consent. Other GA4 account settings and actual event receipt require the account/browser checks above.

The authorised Netlify project is [fireball-studios-web](https://app.netlify.com/projects/fireball-studios-web), in the existing team. Its account was checked as Free, with no payment method and `auto_topup_enabled=false`. The owner has made both Production and Deploy Previews Public. The [review preview](https://review--fireball-studios-web.netlify.app) is publicly reachable and its noindex HTML, disabled analytics, empty sitemap and contact rejection/rate-limit responses have been checked. No production deployment is published and the existing domain still serves the old website. No Resend account or verified sender is configured yet; complete the Resend steps above before claiming that form delivery works.

## Existing DNS snapshot for rollback

Public DNS checked on 8 November 2026; recheck immediately before cutover. These records were read only and have not been changed.

| Record | Existing value |
| --- | --- |
| Authoritative nameservers | `ns17.domaincontrol.com`, `ns18.domaincontrol.com` |
| Apex website A records | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (GitHub Pages) |
| `www` CNAME | `infofireballstudios-369.github.io` |
| Mail MX | priority 10 `mx.zoho.eu`, priority 20 `mx2.zoho.eu`, priority 50 `mx3.zoho.eu` |

The studio mailbox currently routes through **Zoho**. Preserve those MX records and existing Zoho SPF/DKIM/verification records when adding the separate Resend sending-domain records or changing the website. Use the DNS editor controlling the authoritative domaincontrol.com nameservers; owning the registration does not by itself identify which dashboard currently controls DNS. Keep the domain registration active.
