# Production launch and rollback

The owner authorised pushing the new static site to GitHub and replacing the old live website on **9 November 2026**, while preserving all previous data.

## Target and preserved data

- Production URL: https://fireballstudios.co.uk/
- Repository: https://github.com/infofireballstudios-369/fireball-studios-website
- Publication: the manually dispatched GitHub Pages workflow on `main`, publishing only `dist/`.
- Previous live commit: `fd8d42bb6b2f1176603a4a88d37abff0d162db18`.
- Complete old website backup: [archive/live-before-static-20261109](https://github.com/infofireballstudios-369/fireball-studios-website/tree/archive/live-before-static-20261109).
- A second local archive and the original Pages/DNS settings were saved outside the source tree before cutover.
- The original Next.js project, source media and existing Next.js review branch remain preserved. No force-push or history reset is needed.

The existing custom-domain assignment, HTTPS enforcement and website DNS records are retained. Zoho mailbox MX, SPF, DKIM and verification records are not changed. The domain registration and existing mailbox remain active. The old active design is replaced through a new Pages deployment rather than by deleting its backup or history.

## Production settings

`FIREBALL_INDEXING_ENABLED=true` enables the 18 primary sitemap entries and indexable metadata. The `configure-pages` action supplies the existing custom-domain URL; output checks validate canonicals and social/structured URLs. Local builds continue to default to noindex previews. `FORM_PROVIDER=formsubmit` targets info@fireballstudios.co.uk without a backend or private credentials. `public/CNAME` retains the existing domain in the build.

The form recipient still needs its one-time activation and a labelled inbox test. Provider acceptance is not confirmed receipt. Direct-email and copy-brief alternatives remain visible. Follow [CONTACT_SETUP.md](CONTACT_SETUP.md); do not claim email delivery works before that check.

Twelve useful old root HTML addresses have static meta-refresh redirects and visible fallback links. These preserve incoming links to current pages; they are not HTTP 301 responses. Removed technical-service addresses intentionally return the new 404 page rather than advertising services the studio does not offer.

## Checks and remaining limits

The launch preparation passes TypeScript, 64 tests and the production-domain static build. There are 32 generated documents, 18 indexable primary pages, complete local WebP sequences and no initially mounted Vimeo/configurator players. HTTP checks cover both root and repository-prefix hosting. See [VERIFICATION.md](VERIFICATION.md) for the earlier preparation record, and [SEO_GUIDE.md](SEO_GUIDE.md) for topic management and Search Console steps.

Real browser/mobile scrolling, Vimeo playback, WebGL and form CAPTCHA/inbox checks remain outstanding because the browser host was unavailable. GitHub Pages has usage and business-hosting restrictions; see [DEPLOYMENT.md](DEPLOYMENT.md). High-resolution tiers can exceed its soft monthly bandwidth allowance at repeated full traversals; measured sizes are in [MEDIA_QUALITY.md](MEDIA_QUALITY.md). No paid hosting, billing upgrade or automatic recharge is enabled.

## Restore the old website if needed

The backup branch contains the old site's complete root files, including its original CNAME. To restore it without resetting or deleting any source history, an authorised maintainer can switch Pages back to that legacy source:

```sh
gh api --method PUT \
  repos/infofireballstudios-369/fireball-studios-website/pages \
  --input docs/rollback-pages.json
```

Then inspect the Pages build status and verify the public domain serves the old version. This changes the Pages source to the preserved backup branch; it does not delete the new source. DNS and email records remain unchanged. Future return to the new site uses Pages → GitHub Actions and its manual workflow on the approved `main` commit.

## Deployment record

Production publication is prepared; the actual workflow result and public-site checks must be recorded after deployment finishes. A successful local build alone is not a claim that the website is live.
