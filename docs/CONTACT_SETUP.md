# Receive project enquiries by email

This separate static site has no server or private email credentials. Its default contact form uses **FormSubmit**, a free hosted form-to-email service that does not require an account. The destination is fixed to **info@fireballstudios.co.uk**. This does not change the existing Next.js website or its Resend configuration.

## Default: FormSubmit, no account

1. Run `npm run dev` in this standalone project and open the printed local address, then **Contact**. Alternatively use the approved static preview URL. Do not publish or change the domain just to activate the form.
2. Enter your own contact details and label the description **TEST — Fireball Studios contact activation; no project enquiry**. Press **Send enquiry**. The form opens FormSubmit’s website; complete its security check.
3. Open **info@fireballstudios.co.uk** and find the FormSubmit activation email. Check Junk/Spam too. Confirm the form using the activation link. The mailbox owner must do this; it is not an API key or a password.
4. Return to the contact page and send a second clearly labelled test. Confirm that the email arrives and includes **name, phone, email and description**. Check the provider confirmation page as well as the actual mailbox. Provider acceptance and inbox receipt are separate checks.
5. Repeat the receipt check on the final approved hostname after publication. If the provider requests activation for that origin/form, complete it. No domain or DNS changes are needed for this integration.

**Current verification:** source/tests confirm the fixed recipient, four fields, local validation and provider action. No live activation or confirmed inbox receipt has been performed. Until steps 2–4 pass, delivery remains unverified.

The provider’s default CAPTCHA remains enabled. We do not add `_captcha=false`, a CAPTCHA SDK, automatic replies, extra recipients or paid features. FormSubmit performs its own spam checks; client validation cannot prevent direct endpoint abuse. The site never claims success just because its Send button was pressed. The provider handles the challenge and confirmation, while direct email and copy-brief alternatives remain available. The local form preserves details after validation errors. On a provider/network failure, return with the browser’s Back button; browser restoration varies, so copy the brief first if you want a separate copy. The page does not store personal details in local storage.

FormSubmit describes the service as free and retains unconfirmed submissions for up to 30 days. It is an external processor with its own availability, anti-spam restrictions and privacy terms; free does not promise unlimited guaranteed delivery. No payment card, subscription or automatic recharge has been configured by this project. [Official setup](https://formsubmit.co/), [documentation](https://formsubmit.co/documentation), [activation and spam help](https://formsubmit.co/help), [privacy terms](https://formsubmit.co/privacy.pdf).

## Optional: Formspree

If you later prefer its dashboard and in-page submission status, create a free Formspree account, add a form and configure notifications to **info@fireballstudios.co.uk**. Verify that recipient in the provider dashboard. Do not assume that an arbitrary public form endpoint sends to the correct mailbox.

Copy only the public endpoint, for example `https://formspree.io/f/abcdefgh`, into your local `.env`:

```dotenv
FORM_PROVIDER=formspree
FORMSPREE_ENDPOINT=https://formspree.io/f/YOUR_FORM_ID
```

Replace the example with the actual endpoint and rebuild. The URL is public; **never paste an API key, mailbox password or Resend secret into this static site**. The build accepts only the exact HTTPS Formspree form URL format. Contact-page CSP allows the configured submission destination; other pages do not receive form-provider network permissions.

For a GitHub Pages workflow build, set the same public repository Actions variables `FORM_PROVIDER=formspree` and `FORMSPREE_ENDPOINT` under **Settings → Secrets and variables → Actions → Variables**. These are not secrets. Normal builds with `.env` also work. The workflow uses its configured Pages URL independently of these form settings.

The client uses a 15-second deadline, prevents duplicate in-flight sends, handles provider refusal/rate limits and keeps entered details. It reports only provider acceptance after a successful response, never confirmed inbox receipt. Test a labelled enquiry and check the mailbox. If you receive no notification, check provider recipient verification, domain restriction settings, quota, dashboard submissions and Spam/Junk.

At the time of preparation, Formspree Free includes 50 submissions/month and usage warnings at 50%, 75%, 90% and the limit. Keep the Free plan and monitor the dashboard; no paid upgrade or recharge is enabled by this code. Restrict submissions to the approved published host in the provider dashboard where available; add a preview host only for testing. Review current limits before changing plans. [Official AJAX guidance](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax/), [account limits](https://help.formspree.io/articles/account-management/account-limits), [plans](https://formspree.io/plans/).

## Draft-only fallback

Set `FORM_PROVIDER=email` and rebuild to open a draft in the visitor’s own email application. In that mode the visitor must send the email; the website does not deliver it. Every mode retains **Open an email directly** and **Copy your brief**, including phone number and description, addressed to info@fireballstudios.co.uk.
