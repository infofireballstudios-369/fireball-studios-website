import { getFormEndpoint } from "./form-endpoint";
import type { Enquiry } from "../components/contact";

export class EnquirySendError extends Error {
  constructor(public readonly reason: "configuration" | "limit" | "rejected" | "network") {
    super(reason === "limit" ? "The enquiry service is temporarily at its submission limit." : "The enquiry service could not confirm acceptance.");
  }
}

/** A successful HTTP response confirms provider acceptance, not inbox receipt. */
export async function sendEnquiry(endpoint: string, values: Enquiry, options: { fetcher?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<void> {
  let target: string | undefined;
  try { target = getFormEndpoint(endpoint); } catch { throw new EnquirySendError("configuration"); }
  if (!target) throw new EnquirySendError("configuration");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timeout = setTimeout(cancel, options.timeoutMs ?? 15000);
  try {
    const response = await (options.fetcher ?? fetch)(target, {
      method: "POST", credentials: "omit", redirect: "error", referrerPolicy: "strict-origin-when-cross-origin",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, phone: values.phone, email: values.email, message: values.message, _subject: "Project enquiry — Fireball Studios" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new EnquirySendError(response.status === 429 ? "limit" : "rejected");
  } catch (error) {
    if (error instanceof EnquirySendError) throw error;
    throw new EnquirySendError("network");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}
