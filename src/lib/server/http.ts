/** Cancel unused uploads or provider responses without delaying an error reply. */
export function cancelBody(body: ReadableStream<Uint8Array> | null): void {
  if (body && !body.locked) void body.cancel().catch(() => undefined);
}

async function readLimitedJson(response: Response, maxBytes: number, signal: AbortSignal): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) > maxBytes)) {
    cancelBody(response.body);
    throw new Error("The provider response exceeded its limit.");
  }
  if (!response.body) throw new Error("The provider response was empty.");
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    if (signal.aborted) throw new Error("The provider request timed out.");
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error("The provider request timed out.");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error("The provider response exceeded its limit.");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    cancel();
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/** Bound both the transport and response parsing, including stalled response bodies. */
export async function fetchJsonWithLimits(
  fetcher: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  options: { timeoutMs: number; maxBytes: number },
): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("The provider request timed out."));
    }, options.timeoutMs);
  });
  const operation = (async () => {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    if (controller.signal.aborted || !response.ok) {
      cancelBody(response.body);
      throw new Error("The provider did not accept the request.");
    }
    return readLimitedJson(response, options.maxBytes, controller.signal);
  })();
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
