# Media budget and monthly usage

The target is **£0/month for Netlify hosting**, with a measured media budget and regular usage checks. This is not a promise that the website will remain available at every traffic level. Netlify's credit-based Free plan has **300 credits per billing cycle**, a hard limit and no auto recharge. Keep the account on Free and avoid paid add-ons. Domain renewal and any separate email, Vimeo or other service costs are outside this hosting calculation. [Netlify Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/#free-plan).

Rates checked on **8 November 2026**. Check the account's actual plan before relying on these figures; legacy plans differ.

## What the asset check measures

Run from the repository root with the project's Node version:

```sh
node scripts/check-media-budget.mjs
node scripts/check-media-budget.mjs --json
```

| Delivery asset | Measured bytes | Enforced maximum |
| --- | ---: | ---: |
| All three homepage scroll sequences, 12 atlas files | 788,652 | 850,000 |
| Car viewer HTML, including both embedded models, gzip level 6 | 2,475,653 | 2,600,000 |

The checker reads the generated manifest, measures the referenced files and validates their content hashes. It also limits the atlases to 12 files. Missing assets, stale hashes or byte counts, and exceeded limits return a failing exit code. If model delivery moves out of the HTML, update the checker to count those additional model files before publishing.

The car HTML is 3,315,491 bytes before HTTP compression. Its embedded vehicle and rim data are already included in the HTML measurement: do not add the decoded model sizes a second time. The checker reports those sizes for diagnosis. Browser memory usage and transfer size are different measurements.

The homepage requests 24 sampled frames per chapter as four image sheets. It loads nearby sheets rather than downloading every original frame. Reduced-motion mode uses static imagery. Original frame sequences remain intact; this script neither deletes nor excludes source assets. The transfer forecast counts what the active page requests.

Content-hashed atlas URLs support the immutable cache policy in `netlify.toml`. New content must receive new hashes. After an approved deployment, inspect the viewer's `Content-Encoding` and actual transferred bytes in the browser: local gzip is an estimate, not proof of Netlify's response compression. Check the whole homepage with a cold cache, including gallery images, fonts and scripts. Recheck after changing imagery or dependencies.

## Credit calculation

Use decimal units: **1 MB = 1,000,000 bytes; 1 GB = 1,000 MB**.

```text
credits = 20 × transferred GB
        + 2 × Netlify requests / 10,000
        + 15 × production deploys
        + 10 × compute GB-hours
```

These are Netlify's published bandwidth, request, deployment and compute rates. [Credit rates](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/).

The default planning assumptions are 5,000 complete homepage visits, 1.5 MB and 50 Netlify requests per visit, one production deployment, and **zero compute entered**. Zero is an explicit placeholder until compute is estimated or measured; it does not mean functions, email delivery, rendering or other server work are free. Every additional GB-hour adds 10 credits.

For each optional 3D launch, allow **2.5 MB and five additional Netlify requests**. The viewer itself is one local HTML request; the remaining four are a planning allowance for navigation and interface assets, not a measured browser trace. The calculator raises the viewer byte allowance if its measured gzip size exceeds it. Separate project-page image transfers still need an additional bandwidth allowance. Three.js dependencies currently load from an external CDN; their transfers are not Netlify transfers. Recalculate if they are hosted locally.

| Monthly scenario | Bandwidth credits | Request credits | Deploy credits | Compute entered | Total | Remaining from 300 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 5,000 homepage visits | 150 | 50 | 15 | 0 | **215** | 85 |
| Same visits + 250 3D launches | 162.5 | 50.25 | 15 | 0 | **227.75** | 72.25 |
| Same visits + 5,000 3D launches | 400 | 55 | 15 | 0 | **470** | **170 over** |

The 1.5 MB/50-request allowance is a target, not an enforced browser-page cap. Passing the two asset limits does not prove the complete site fits the monthly plan. Fewer than 5,000 unique visitors can still generate more than 5,000 visits, multiple pages and repeated 3D launches. Include bots, redirects, API responses, preview traffic and other projects on the same team. Images served by Netlify's CDN also consume bandwidth. [How usage is counted](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/#credit-usage-for-bandwidth).

Model additional use explicitly:

```sh
node scripts/check-media-budget.mjs --launches=250 --compute-gbh=0.5 --extra-gb=0.5 --extra-requests=10000 --enforce-forecast
node scripts/check-media-budget.mjs --launches=5000 --enforce-forecast
```

The first example forecasts 244.75 credits. The second fails because its selected forecast exceeds 300. Without `--enforce-forecast`, the checker reports the risky scenarios while enforcing the asset limits; it does not treat every illustrated scenario as expected traffic. Use `--help` for all assumptions, including `--visits`, `--deploys`, `--mb-per-visit` and `--viewer-requests`.

## Operating within Free

Netlify sends email and in-app usage notifications at **50%, 75% and 100%** of the team's monthly allocation. Review **Usage & billing → Credit balance** and **Credit usage breakdown** regularly; these cover the team, not just this website. [Usage monitoring](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/monitor-usage-for-credit-based-plans/).

| Threshold | Operational response |
| --- | --- |
| 50% / 150 credits | Check the billing-cycle dates, daily consumption and remaining planned deployments. Update the forecast with observed transfers, requests, 3D launches and compute. |
| 75% / 225 credits | If the projected cycle total exceeds 300, stop optional production releases and prepare a reviewed reduction in media delivery. Options include retaining the existing poster and film links in place of live 3D or scroll playback. These require code changes and a normal deployment; reserve its 15 credits. There is no automatic budget toggle in the application. |
| 100% / 300 credits | Expect Netlify's hard pause. Check the dashboard and next credit reset. Keep Free and accept possible downtime rather than enabling paid capacity without the owner's approval. |

Once the credit balance is exhausted, Netlify pauses the team's projects; monthly credits reset at the next billing cycle. The £0 target therefore trades spending protection for possible interruption. [Credit balance and pausing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/#monthly-credit-allotment).

Use local checks and deployment previews for review, then batch approved changes into production releases. Preview deployment creation has no production-deploy charge, but preview traffic and compute still need a budget. [Deployment and usage rules](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/#credit-usage-for-production-deploys).
