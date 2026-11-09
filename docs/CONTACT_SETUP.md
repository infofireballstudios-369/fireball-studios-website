# Enquiry delivery and troubleshooting

The website remains at **https://fireballstudios.co.uk/** on GitHub Pages. The four-field contact panel loads a small, isolated form from **https://fireball-studios-enquiries.netlify.app/**. Netlify handles the form, retains dashboard submissions and sends notifications to **info@fireballstudios.co.uk**. No custom API, server runtime, Resend key or new account is required.

## Recipient and dashboard

- Project: [Fireball Studios enquiries](https://app.netlify.com/projects/fireball-studios-enquiries).
- Forms: open **Forms → fireball-project-enquiry**. Check both **Verified** and **Spam** submissions.
- Notification: email event `submission_created`, recipient **info@fireballstudios.co.uk**, subject **Fireball Studios — new project enquiry**.
- The owner confirmed the Netlify recipient email, and the provider API reports no pending confirmation or recipient restriction.

A confirmed recipient proves consent/configuration, not inbox receipt. A real labelled test must establish both a dashboard entry and an email at the studio inbox. Do not describe a successful form response as confirmed email delivery.

## Test the complete path

1. Open the website’s Contact page, or the [standalone form](https://fireball-studios-enquiries.netlify.app/).
2. Enter your own name, phone, email and a description such as **This is a Fireball Studios delivery test**. Complete the security check and send once.
3. Confirm the acknowledgement. If an error appears, the brief stays in the form; use the direct email or copy alternative.
4. Check the project’s Verified/Spam dashboard for the matching timestamp and all four fields.
5. Confirm the notification reaches **info@fireballstudios.co.uk**. A dashboard entry and an inbox message are separate evidence.

If there is no dashboard entry, check visible validation/CAPTCHA errors, network state and Spam submissions. A message containing only “test” fails the 10-character description minimum. If a verified entry exists but no email arrives, inspect **Forms → Submission notifications**, recipient confirmation, Spam/Junk and Zoho’s Incoming Quarantine. Do not turn off spam protection or change MX/SPF records merely because a notification is missing.

## Security and privacy

The form posts to its own Netlify origin using the provider’s supported form handler. It includes a named form, honeypot and Netlify-provided CAPTCHA. Client validation is shared with the parent project. Errors preserve the brief; a 15-second deadline and in-flight/accepted guards reduce accidental duplicate submissions. No input data enters the iframe bridge: only checked state and height messages pass between the two sites.

Only the approved host can be embedded by the production contact panel. The form host’s framing policy permits the Fireball domains and the four known local development origins. New-tab email/privacy links use `noopener`; no unrestricted top-level navigation is allowed. All form pages are noindex. The privacy notice names Netlify storage and Google’s security check. Neither site installs analytics for this form.

Private Netlify credentials stay in the maintainer’s authenticated CLI/provider account. They are never included in JavaScript, GitHub variables, HTML or the public URL.

## Free-plan limits

The existing team was verified as **Free / credit-free**, with 300 included credits and automatic top-ups disabled. Forms submissions are currently free and unlimited on credit-based plans, while deployment/traffic still consume the shared allowance. A production deploy uses 15 credits; bandwidth uses 20 credits/GB and requests use 2 credits per 10,000. The form build is approximately 90 KB before provider processing/CAPTCHA. The large website media remain on GitHub.

Free has a hard credit limit; it can pause the form service when exhausted. Review **Usage & billing** for the whole team and avoid paid add-ons or plan changes. No card, paid upgrade or recharge was configured by this integration. Current provider rules: [Forms billing](https://docs.netlify.com/manage/forms/usage-and-billing/), [credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).

## Maintain and redeploy

Use Node.js 24. Public settings in `.env.example` are:

```dotenv
FORM_PROVIDER=netlify
NETLIFY_FORM_URL=https://fireball-studios-enquiries.netlify.app/
```

Set the same public repository Actions variables for the Pages build. These are not API credentials. Local development should copy `.env.example` to `.env`; keep `NOINDEX=true` for local/review builds.

After changing the capture UI or submission code:

```sh
npm run type-check
npm test
npm run build:capture
npx --package=netlify-cli@27.16.2 netlify deploy \
  --dir capture-dist --site 53f38868-600d-47ff-b31d-d2ddc944bf6f \
  --prod --no-build
```

Use the existing secure CLI login; never paste tokens into source or chat. This publishes only the isolated form project, preserving `fireball-studios-web`, the old Next.js preview. Confirm form detection remains enabled, public production access works and all four fields remain registered. Recheck the CAPTCHA, dashboard capture and inbox after a behaviour change.

Main website changes still use the manually dispatched GitHub Pages workflow. It builds and checks the source, then publishes `dist/`; `capture-dist/` is excluded from Git and the Pages artifact. Deploy the capture service first when changing the shared iframe protocol.

## Previous FormSubmit diagnosis

The previous form and old website both used `https://formsubmit.co/info@fireballstudios.co.uk`. The owner saw its success page but received neither an enquiry nor activation message; ordinary mail arrived and Zoho Spam/Quarantine were empty. That showed the need for a traceable delivery path, but did not identify FormSubmit’s internal cause. No change to email DNS was warranted.

`FORM_PROVIDER=formsubmit` remains a legacy setting, with CAPTCHA retained; `formspree` requires a verified public `FORMSPREE_ENDPOINT`. `FORM_PROVIDER=email` opens a draft the visitor must send. Production uses the Netlify form and keeps direct-email/copy alternatives.

[Netlify form setup](https://docs.netlify.com/manage/forms/setup/), [notification recipient confirmation](https://docs.netlify.com/manage/forms/notifications/), [spam handling](https://docs.netlify.com/manage/forms/spam-filters/), [Zoho quarantine](https://www.zoho.com/mail/help/adminconsole/spam-quarantine.html).
