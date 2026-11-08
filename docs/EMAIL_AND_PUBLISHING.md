# Email authentication and publishing

## Getting enquiries into info@fireballstudios.co.uk

Visitors do not need an account or authentication. The server authenticates to an email delivery provider. This is separate from the mailbox where you receive enquiries.

1. Keep `info@fireballstudios.co.uk` active with your existing mailbox provider. Confirm that you can send a normal email to it and receive the message.
2. Sign in to Resend and add a sending subdomain, for example `notifications.fireballstudios.co.uk`. Using a dedicated sending subdomain keeps website delivery separate from your normal business email.
3. In the DNS service that actually hosts your domain's records, add the exact DKIM and sending/return-path records shown by Resend. At 123 Reg this is normally the domain's DNS management screen. Wait for Resend to show the domain as verified.
4. Preserve the existing root-domain MX records for your mailbox. Do not enable Resend receiving or replace the mailbox MX records just to send contact enquiries. Resend may request an MX record on a return-path subdomain; use the exact hostname it supplies.
5. Create a Resend API key with sending access limited to that verified domain. Store it as `RESEND_API_KEY` in the hosting environment. Do not paste it into chat, browser code, GitHub files or a `NEXT_PUBLIC_` variable.
6. Set `CONTACT_FROM_EMAIL` to a bare address on the verified sender domain, for example `website@notifications.fireballstudios.co.uk`. It must match the domain you actually verified. It is the sender, not the destination.
7. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from your Upstash Redis REST database. These protect the endpoint across multiple server instances. Production deliberately fails closed when its required protection is absent.
8. Redeploy after setting the environment values. Submit one labelled test enquiry and confirm both provider delivery status and actual receipt in the studio mailbox. Reply to the message to check that it replies to the visitor.

The destination is fixed in server code as `info@fireballstudios.co.uk`. The visitor's email is used only as reply-to. Name, phone and description are included in the plain-text message. Provider acceptance is not an inbox-delivery guarantee; monitor provider failures, bounces and spam-folder placement. Identical retries are deduplicated by Resend for its documented 24-hour window.

For local development, copy `.env.example` to `.env.local` and fill it on your own machine. For production, use your host's encrypted environment settings. Do not store live secrets in `.env.example` or GitHub Actions YAML.

## GitHub is the source; a server-capable host runs the site

The existing repository is `infofireballstudios-369/fireball-studios-website`. Its current `main` branch contains the old static website and is served by GitHub Pages at the domain.

This replacement is a Next.js app with a server-side contact endpoint and image optimisation. GitHub Pages serves static files and cannot run that endpoint. Use GitHub-connected Next.js hosting, such as Vercel, so pushes create preview builds and the production branch creates the live deployment.

Vercel's Hobby plan is restricted to personal/non-commercial use. Fireball Studios is a business; choose an appropriate commercial plan or another host that supports Next.js server routes. Check current pricing before subscribing. No hosting subscription is created by the local preparation work.

## Why a release export is needed

The local repository preserves original videos, including files larger than GitHub's 100 MiB regular-file limit. Deleting them in a later commit would not remove them from earlier history. The safe publishing workflow exports only application source and runtime assets, then applies that export to a new branch based on the existing GitHub repository. It leaves the original local history and media intact.

Example export command:

~~~sh
node scripts/export-release.mjs /absolute/path/to/a/new-empty-directory
~~~

The exporter refuses a non-empty destination, excludes local credentials and archived videos/previews/motion files, checks file sizes, and records file hashes in `RELEASE_MANIFEST.json`. Do not force-push or rewrite the existing `main` branch to bypass the large-file limit. After the new source is approved, use a clone of the clean GitHub repository for routine edits and normal pushes; retain this original folder as the full media/history archive. The export is the one-time migration path. Media-generation scripts read the separate original Projects archive; that archive is intentionally not required for ordinary builds or included in GitHub source.

## Publish the replacement

1. Review the prepared GitHub branch/pull request and its checks. Keep the existing `main` branch and Pages website available during preparation.
2. Sign in to your chosen host with GitHub. Import `fireball-studios-website`, choose Next.js, Node.js 24 and the repository root. Build command: `npm run build`. Let the platform manage Next.js output; do not select `out` or a static export.
3. Select the prepared review branch as the initial deployment source rather than the old static main branch, then deploy a preview. Set its required email and Redis environment values. For a non-Vercel preview, set `SITE_NOINDEX=true`; Vercel previews are detected automatically. Add the exact HTTPS preview origin as `CONTACT_SITE_ORIGIN` when testing the form.
4. Test desktop/mobile layouts, keyboard controls, Vimeo films, reverse scroll scrubbing, the automotive viewer and a real enquiry on the preview URL. Check Vimeo's allowed-domain settings if a player refuses the preview hostname.
5. For the first cutover, deploy the approved review branch or promote its verified preview on the new host while the old GitHub Pages main branch stays intact. Keep `SITE_NOINDEX=false` in production and configure all required production secrets. This avoids breaking the old Pages site before DNS has moved.
6. Add both `fireballstudios.co.uk` and `www.fireballstudios.co.uk` in the hosting dashboard. Use the apex domain as primary and redirect `www` to it. The host will supply the exact DNS values and any ownership-verification TXT record.
7. In 123 Reg, update only the relevant website A/AAAA and `www` CNAME records to the host's supplied values. Do not copy a generic IP address from an old tutorial. Remove conflicting website records only as required by the new host. Preserve email MX/TXT records and other unrelated services. If authoritative DNS is elsewhere, make the changes there instead.
8. Wait for domain verification and HTTPS to become valid, then test the real domain, the `www` redirect, old URL redirects, `/sitemap.xml`, `/robots.txt` and another real enquiry. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
9. After the new site is confirmed, merge the approved source and set the new host’s normal production branch to main. Remove the old GitHub Pages domain assignment/CNAME and disable the obsolete Pages publication as appropriate. Retain the old source and DNS values for rollback. Do not cancel a 123 Reg package that also supplies your mailbox without separating the email service first.

Existing relevant `.html` URLs redirect to matching new routes. Removed engineering-service pages have no matching service in the new portfolio; they should return a real missing-page response rather than making inaccurate service claims.

## If publishing pauses

GitHub authentication can be checked with `gh auth status`; if needed, run `gh auth login -h github.com` and complete its secure browser/device flow. Never send a personal access token in chat. Hosting login, a chosen commercial plan, Resend/Redis credentials and DNS access are separate prerequisites. A GitHub push alone does not complete the domain cutover.

## Official references

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [Vercel Git deployments](https://vercel.com/docs/git)
- [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby)
- [123 Reg: point a domain to another host](https://www.123-reg.co.uk/support/domains/how-do-i-point-my-domain-name-to-an-ip-address/)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)
- [Resend API-key permissions](https://resend.com/changelog/new-api-key-permissions)
- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
