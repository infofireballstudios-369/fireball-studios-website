# Deploying the standalone static site

This guide applies only to `fireball-gh-pages`. The existing `../website-FB` project is unchanged. On 9 November 2026 the owner authorised publishing this static replacement through the existing GitHub repository at fireballstudios.co.uk. See [LIVE_LAUNCH.md](LIVE_LAUNCH.md) for the exact backup and rollout. Local builds alone never publish anything.

## Confirm GitHub Pages suitability first

GitHub Pages is available with GitHub Free for public repositories. Its current terms restrict using Pages as free hosting to run an online business, e-commerce site or commercial SaaS. This build is an informational portfolio without checkout or visitor accounts (its contact provider processes submitted enquiries), but that does not itself establish eligibility for a studio business. Confirm the intended use is permitted before publishing; do not treat this guide as a guarantee of eligibility. [GitHub Pages limits and permitted use](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

The published-site limit is 1 GB and the bandwidth allowance is a soft 100 GB per month, not unlimited traffic. The revised local build is approximately 135 MB, including all optional native-resolution frame tiers; its size is well below the site limit, but downloads, repeat visits and bots still consume bandwidth. There is no guaranteed visitor capacity. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

The owner has now approved replacement of the existing GitHub Pages site. Preserve its old source/history and backup branch. The custom domain remains assigned to the same repository; no DNS or email-record changes are part of this rollout. Separate review deployments must still use noindex settings.

## What gets hosted

Publish **only `dist/`**. It contains ordinary static HTML, CSS, JavaScript, fonts and media. Node.js 24 is needed to install dependencies, develop and build; no Node process runs on the deployed website. GitHub Pages serves the generated files. [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

The source uses Vite's `base: './'` and generates a real `index.html` in each route directory, including nested project and article pages. The generated `404.html` stands alone. The old automotive article address contains a meta refresh and a visible link to the spaceship article; this is a static redirect page, not an HTTP 301 rule.

Do not publish `node_modules/`, `.archive/original-20261109`, development configuration or the old starter. Fonts are hosted with the site. Films stream from Vimeo only after a click; the car viewer and its pinned external modules load only when launched. The included WebP frames load progressively as needed.

## Build and inspect locally

~~~sh
npm ci
npm run type-check
npm test
npm run build
npm run preview
~~~

Inspect `http://127.0.0.1:4175/`. A build generates 32 page documents, runs TypeScript and checks local output: 18 primary pages, two fallback documents and 12 legacy redirects. Review actual desktop and mobile browsers, keyboard controls, films, the configurator and the contact flow before treating the release as verified. Those browser checks remain outstanding because the browser host was unavailable during preparation.

Production uses the isolated Netlify capture form. Keep CAPTCHA, dashboard storage and the confirmed info@fireballstudios.co.uk notification setting intact; see [CONTACT_SETUP.md](CONTACT_SETUP.md). A labelled human test must confirm capture and inbox receipt. The earlier FormSubmit success response did not establish delivery and is retained only as an explicit alternative. No private email key belongs in the static website.

## URL and indexing settings

[.env.example](../.env.example) documents public build settings:

| Setting | Meaning |
| --- | --- |
| `SITE_URL` | Absolute canonical website URL, including the repository path and trailing slash where applicable |
| `NOINDEX` | Indexing stays disabled unless its value is exactly `false` |
| `FORM_PROVIDER` | `netlify` for production; explicit `formsubmit`, `formspree` or `email` alternatives |
| `FORMSPREE_ENDPOINT` | Optional verified public endpoint, used with `formspree` |
| `NETLIFY_FORM_URL` | Approved public capture URL, used with `netlify` |
| `GA_MEASUREMENT_ID` | Public web measurement ID, currently `G-7RV5GM0GCF` |
| `ENABLE_ANALYTICS` | Only exact `true` enables the eligible production consent integration |

The default example is `SITE_URL=https://fireballstudios.co.uk/` with `NOINDEX=true`. This keeps an isolated copy out of search while the existing website remains live. `SITE_URL` affects canonicals, social URLs, structured data and the sitemap; relative navigation and assets use the renderer's page-depth helpers.

For local configuration, optionally copy `.env.example` to `.env` and edit its `SITE_URL` and `NOINDEX` values. The npm generation/development commands use Node.js 24's `--env-file-if-exists=.env` support, so the local file is loaded automatically when present. Existing shell and CI environment values take precedence. These are public build settings; do not add credentials to the file.

For a one-off local build targeting a repository URL, override the values directly:

~~~sh
SITE_URL='https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/' NOINDEX=true npm run build
~~~

With noindex enabled, the primary pages have noindex metadata and the sitemap is empty. Robots remains crawlable so search systems can read that instruction. Noindex is not authentication or protection for confidential material.

Only enable indexing when the correct published URL and its relationship to the existing site have been approved. Rebuild after changing these settings. Check that nested project/article canonicals retain the repository path rather than unexpectedly pointing at the domain root.

## Manual GitHub Pages workflow

The prepared `.github/workflows/pages.yml` uses `workflow_dispatch`: publishing is a deliberate manual action rather than an automatic consequence of every push. Do not run it until the target repository and publication are approved.

1. The authorised production repository is `infofireballstudios-369/fireball-studios-website`. Preserve `archive/live-before-static-20261109` and the old commit history. New source must be integrated without force-pushing or resetting history. The Pages workflow must exist on `main` before it can be dispatched.
2. In that repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
3. Set `FIREBALL_INDEXING_ENABLED=true` for the authorised public site; keep it false or unset for isolated reviews. Production uses `FORM_PROVIDER=netlify` and the approved `NETLIFY_FORM_URL`. For optional GA4, set `GA_MEASUREMENT_ID=G-7RV5GM0GCF` and `ENABLE_ANALYTICS=true`; keep Enhanced Measurement off as previously confirmed by the owner. Non-brand/noindex/local builds remain ineligible. See [ANALYTICS.md](ANALYTICS.md).
4. Open **Actions**, select the Pages workflow, choose the approved branch and run it manually. It uses Node.js 24, installs from the lockfile, builds and uploads `dist/`, then deploys the Pages artifact.
5. The workflow obtains `SITE_URL` from the `actions/configure-pages` step's `base_url` output. This gives metadata the actual Pages address, including a project-repository path. No deployment token should be pasted into source or chat; the workflow uses GitHub's scoped workflow token and Pages permissions.
6. Review the workflow result and https://fireballstudios.co.uk/. Check Home, every hub, nested pages, legacy redirects, responsive images, the real 404 response, indexable primary metadata and 18 sitemap URLs. Check media and contact behaviour in a real browser. Isolated previews should instead stay noindex with an empty sitemap.

GitHub's Pages workflow uses `configure-pages`, `upload-pages-artifact` and `deploy-pages`, with a `github-pages` deployment environment and appropriate `pages: write` / `id-token: write` permissions. [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Production includes `public/CNAME` containing the existing `fireballstudios.co.uk` assignment. GitHub Pages settings remain the source of truth for the custom domain. Preserve HTTPS enforcement. Do not remove the domain assignment or change DNS as part of a routine build. A separate review repository must not claim the production domain.

## After publication

Use the host's actual reported URL and inspect the deployed output rather than assuming a successful build proves every browser interaction. Retain the previous approved artifact or source commit so a failed release can be replaced by rebuilding that known version and manually running the workflow again.

If indexing is later approved, set `FIREBALL_INDEXING_ENABLED=true`, rerun the workflow and verify the canonical URL, populated sitemap and indexable metadata. Submit the correct sitemap through Search Console or Bing Webmaster Tools only for the intended public site. No search ranking or indexing result is guaranteed.

Optional GA4 is generated only for eligible primary production pages and loads its tag after visitor acceptance. Equal accept/reject controls and footer preferences manage a 90-day choice; advertising features stay disabled. Keep Enhanced Measurement off and use the existing public ID, not a private API key. Redirects, 404, viewer and enquiry capture do not initialise GA4. Netlify's Google reCAPTCHA may operate independently for form security. Verify live collection separately through the owner's Realtime view; see [ANALYTICS.md](ANALYTICS.md). GitHub and media providers still process service/network information. Keep usage within hosting limits and review eligibility again if adding commercial transactions, hosted software or sensitive data handling.

## Higher-quality media and traffic

The on-disk library contains several resolutions, but visitors request only the selected tier and nearby frames for the active chapter. See [MEDIA_QUALITY.md](MEDIA_QUALITY.md) for exact selection rules and measured bytes. A complete uncached home traversal is about 10.94 MB at 1280px, 28.38 MB at 1920px, 38.10 MB at 2560px or 59.49 MB at native 4K. At 5,000 complete uncached traversals, the Full HD and higher tiers exceed the 100 GB soft monthly allowance before other resources. Adaptive/progressive loading can reduce actual transfer but does not guarantee capacity. Nothing here enables a paid upgrade or changes hosting. Review real host usage and choose the media policy accordingly before publication.

## Production contact handling

The main Pages deployment now selects `FORM_PROVIDER=netlify` and the public `NETLIFY_FORM_URL=https://fireball-studios-enquiries.netlify.app/`. The isolated form is managed by the existing Netlify Free account. It captures a dashboard copy and notifies the confirmed studio recipient. The website domain, DNS and Zoho routing are unchanged.

Build `capture-dist/` separately with `npm run build:capture` and deploy only that directory to the enquiry project. Do not deploy the full media library to Netlify. The Pages workflow validates this build but does not transfer Netlify credentials or automatically publish the capture project. Follow [CONTACT_SETUP.md](CONTACT_SETUP.md) for the authorised CLI procedure and test record.
