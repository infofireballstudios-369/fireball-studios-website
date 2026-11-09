export class CaptureSendError extends Error {
  constructor(public readonly reason: "configuration" | "rejected" | "limit" | "network" | "timeout") { super("The form service could not confirm acceptance."); }
}

/** Submit only to the capture site's own handler; provider acceptance is not inbox receipt. */
export async function submitCapture(action: string, data: FormData, options: { currentUrl: string; fetcher?: typeof fetch; signal?: AbortSignal; timeoutMs?: number }): Promise<void> {
  const current = new URL(options.currentUrl);
  const target = new URL(action, current);
  if (!["https:", "http:"].includes(current.protocol) || target.origin !== current.origin || target.username || target.password || target.search || target.hash) throw new CaptureSendError("configuration");
  const payload = new URLSearchParams();
  for (const [name, value] of data) {
    if (typeof value !== "string") throw new CaptureSendError("configuration");
    payload.append(name, value);
  }
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  let onAbort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new CaptureSendError(timedOut ? "timeout" : "network"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  if (options.signal?.aborted) cancel();
  const timeout = setTimeout(() => { timedOut = true; cancel(); }, options.timeoutMs ?? 15000);
  try {
    const response = await Promise.race([Promise.resolve().then(() => (options.fetcher ?? fetch)(target.href, {
      method: "POST", credentials: "omit", redirect: "follow", signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: payload.toString(),
    })), aborted]);
    if (!response.ok) throw new CaptureSendError(response.status === 429 ? "limit" : "rejected");
    if (response.url && new URL(response.url).origin !== current.origin) throw new CaptureSendError("rejected");
  } catch (error) {
    if (error instanceof CaptureSendError) throw error;
    throw new CaptureSendError("network");
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
