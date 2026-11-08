export const deliveryError = "We couldn’t send your enquiry. Your details are still here; please try again or use email.";

/** Platform rate limits can return an empty body, unlike our JSON application errors. */
export async function readEnquiryAcknowledgement(response: Response): Promise<void> {
  if (response.status === 429) throw new Error("Too many enquiries. Please wait three minutes before trying again, or send your enquiry by email. Your details are still here.");
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error(deliveryError); }
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true || response.status !== 202) {
    const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : deliveryError;
    throw new Error(message);
  }
}
