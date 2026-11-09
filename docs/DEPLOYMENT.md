# Deploying the standalone static site

This guide applies only to `/Users/hc/Documents/Fireball/fireball-gh-pages`. The existing `/Users/hc/Documents/Fireball/website-FB` project and live domain are unchanged. No GitHub repository, Pages deployment, custom domain or DNS change is created by a local build.

## Confirm GitHub Pages suitability first

GitHub Pages is available with GitHub Free for public repositories. Its current terms restrict using Pages as free hosting to run an online business, e-commerce site or commercial SaaS. This build is an informational portfolio without checkout or visitor accounts (its contact provider processes submitted enquiries), but that does not itself establish eligibility for a studio business. Confirm the intended use is permitted before publishing; do not treat this guide as a guarantee of eligibility. [GitHub Pages limits and permitted use](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

The published-site limit is 1 GB and the bandwidth allowance is a soft 100 GB per month, not unlimited traffic. The revised local build is approximately 135 MB, including all optional native-resolution frame tiers; its size is well below the site limit, but downloads, repeat visits and bots still consume bandwidth. There is no guaranteed visitor capacity. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

Keep the publication separate from the existing live repository/site until a replacement is explicitly approved. Do not add a `CNAME`, configure a custom domain or change DNS as part of an isolated review deployment.

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

Inspect `http://127.0.0.1:4175/`. A build generates 20 page documents, runs TypeScript and checks local output. Review actual desktop and mobile browsers, keyboard controls, films, the configurator and the contact flow before treating the release as verified. Those browser checks remain outstanding because the browser host was unavailable during preparation.

The default form uses the free, no-account FormSubmit service. Activate notifications to info@fireballstudios.co.uk and confirm a labelled test arrives before publication; see [CONTACT_SETUP.md](CONTACT_SETUP.md). The provider’s spam challenge stays enabled. A static build cannot prove mailbox delivery. No private email key should be added to the website.

## URL and indexing settings

[.env.example](../.env.example) documents public build settings:

| Setting | Meaning |
| --- | --- |
| `SITE_URL` | Absolute canonical website URL, including the repository path and trailing slash where applicable |
| `NOINDEX` | Indexing stays disabled unless its value is exactly `false` |
| `FORM_PROVIDER` | `formsubmit` (default), `formspree` or `email` |
| `FORMSPREE_ENDPOINT` | Optional verified public endpoint, used with `formspree` |

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

1. After confirming eligibility, choose an approved **separate public repository** for this source. Do not overwrite the old live website repository. Make the workflow available on the repository's default branch so GitHub can show its manual Run workflow control.
2. In that repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
3. Leave the repository Actions variable `FIREBALL_INDEXING_ENABLED` unset or set to `false` during review. The workflow defaults to `NOINDEX=true`. Only an exact value of `true` enables indexing by setting `NOINDEX=false`.
4. Open **Actions**, select the Pages workflow, choose the approved branch and run it manually. It uses Node.js 24, installs from the lockfile, builds and uploads `dist/`, then deploys the Pages artifact.
5. The workflow obtains `SITE_URL` from the `actions/configure-pages` step's `base_url` output. This gives metadata the actual Pages address, including a project-repository path. No deployment token should be pasted into source or chat; the workflow uses GitHub's scoped workflow token and Pages permissions.
6. Review the workflow result and the resulting Pages URL. Check Home, each hub, a nested project, a nested article, image paths, the 404, noindex metadata and the empty review sitemap. Check media and contact behaviour in a real browser.

GitHub's Pages workflow uses `configure-pages`, `upload-pages-artifact` and `deploy-pages`, with a `github-pages` deployment environment and appropriate `pages: write` / `id-token: write` permissions. [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The project ships without a `CNAME`. Leave the custom-domain field empty for the isolated Pages site. Connecting `fireballstudios.co.uk` later is a separate launch decision involving the current hosting, DNS, email records, redirects and rollback; it is not part of this local preparation.

## After publication

Use the host's actual reported URL and inspect the deployed output rather than assuming a successful build proves every browser interaction. Retain the previous approved artifact or source commit so a failed release can be replaced by rebuilding that known version and manually running the workflow again.

If indexing is later approved, set `FIREBALL_INDEXING_ENABLED=true`, rerun the workflow and verify the canonical URL, populated sitemap and indexable metadata. Submit the correct sitemap through Search Console or Bing Webmaster Tools only for the intended public site. No search ranking or indexing result is guaranteed.

This standalone version installs no Google Analytics or advertising tracker. GitHub and media providers may still process network information needed to serve their services; see the site's privacy page and each provider's terms. Keep usage within current hosting limits and review eligibility again if adding commercial transactions, hosted software or sensitive data handling.

## Higher-quality media and traffic

The on-disk library contains several resolutions, but visitors request only the selected tier and nearby frames for the active chapter. See [MEDIA_QUALITY.md](MEDIA_QUALITY.md) for exact selection rules and measured bytes. A complete uncached home traversal is about 10.94 MB at 1280px, 28.38 MB at 1920px, 38.10 MB at 2560px or 59.49 MB at native 4K. At 5,000 complete uncached traversals, the Full HD and higher tiers exceed the 100 GB soft monthly allowance before other resources. Adaptive/progressive loading can reduce actual transfer but does not guarantee capacity. Nothing here enables a paid upgrade or changes hosting. Review real host usage and choose the media policy accordingly before publication.
