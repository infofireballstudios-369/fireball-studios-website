/** Public form identifiers are safe to publish; credentials never belong here. */
export const formsubmitAction = "https://formsubmit.co/info@fireballstudios.co.uk";

export function getFormEndpoint(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]{6,64}$/.test(value.trim())) {
    throw new Error("FORMSPREE_ENDPOINT must be a public https://formspree.io/f/ form URL, without credentials or query parameters.");
  }
  return value.trim();
}
