/** Public form identifiers are safe to publish; credentials never belong here. */
export const formsubmitAction = "https://formsubmit.co/info@fireballstudios.co.uk";
export const netlifyEnquiryOrigin = "https://fireball-studios-enquiries.netlify.app";

/** Keep hosted enquiries on the studio's one approved capture site. */
export function getNetlifyFormUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (value.trim() !== netlifyEnquiryOrigin && value.trim() !== netlifyEnquiryOrigin + "/") {
    throw new Error("NETLIFY_FORM_URL must be the approved HTTPS enquiry-site root, without credentials, a query or a fragment.");
  }
  return netlifyEnquiryOrigin + "/";
}

export function getFormEndpoint(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]{6,64}$/.test(value.trim())) {
    throw new Error("FORMSPREE_ENDPOINT must be a public https://formspree.io/f/ form URL, without credentials or query parameters.");
  }
  return value.trim();
}
