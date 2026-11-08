type DecodedFrame = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

type FrameStoreOptions = {
  /** Bound stalled requests; a shorter value also permits deterministic network tests. */
  fetchTimeoutMs?: number;
};

/** Keep compressed frames available, with a bounded cache of decoded images. */
export function createFrameStore(paths: string[], signal: AbortSignal, cacheSize = 14, options: FrameStoreOptions = {}) {
  const fetchTimeoutMs = options.fetchTimeoutMs ?? 8_000;
  if (!Number.isFinite(fetchTimeoutMs) || fetchTimeoutMs <= 0) throw new RangeError("fetchTimeoutMs must be positive and finite");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const storeSignal = controller.signal;
  const blobs = new Map<number, Promise<Blob | null>>();
  const fetchAttempts = new Map<number, number>();
  const decoded = new Map<number, DecodedFrame>();
  type Request = { index: number; promise: Promise<DecodedFrame | null>; resolve: (frame: DecodedFrame | null) => void };
  const pending = new Map<number, Request>();
  const queued = new Map<number, Request>();
  const limit = Math.max(1, Math.floor(cacheSize));
  let decoding = 0;
  let priorityIndex = -1;
  let disposed = false;
  let preloadRequest: Promise<void> | undefined;

  const fetchFrame = (index: number, retry = false): Promise<Blob | null> => {
    if (disposed || storeSignal.aborted) return Promise.resolve(null);
    if (retry) blobs.delete(index);
    if (!blobs.has(index)) {
      fetchAttempts.set(index, (fetchAttempts.get(index) ?? 0) + 1);
      const request = new AbortController();
      const cancelRequest = () => request.abort();
      let settleAbort!: () => void;
      const aborted = new Promise<null>((resolve) => { settleAbort = () => resolve(null); });
      request.signal.addEventListener("abort", settleAbort, { once: true });
      storeSignal.addEventListener("abort", cancelRequest, { once: true });
      const timeout = setTimeout(cancelRequest, fetchTimeoutMs);
      const response = Promise.resolve().then(() => fetch(paths[index], { signal: request.signal }))
        .then((response) => response.ok ? response.blob() : null)
        .catch(() => null);
      // Settle even if an underlying fetch implementation ignores cancellation.
      blobs.set(index, Promise.race([response, aborted]).finally(() => {
        clearTimeout(timeout);
        storeSignal.removeEventListener("abort", cancelRequest);
        request.signal.removeEventListener("abort", settleAbort);
      }));
    }
    return blobs.get(index)!;
  };

  const pump = () => {
    if (storeSignal.aborted) {
      queued.forEach((request, index) => { request.resolve(null); pending.delete(index); });
      queued.clear();
      return;
    }
    while (!disposed && !storeSignal.aborted && decoding < 2 && queued.size > 0) {
      const candidates = [...queued.values()].reverse();
      const request = priorityIndex < 0 ? candidates[0] : candidates.reduce((nearest, candidate) =>
        Math.abs(candidate.index - priorityIndex) < Math.abs(nearest.index - priorityIndex) ? candidate : nearest);
      const { index } = request;
      queued.delete(index);
      decoding++;
      void decode(index).then(request.resolve).finally(() => {
        decoding--;
        pending.delete(index);
        pump();
      });
    }
  };

  const decode = async (index: number): Promise<DecodedFrame | null> => {
      try {
        let blob = await fetchFrame(index);
        // Background work never retries. The currently requested frame gets one recovery attempt.
        if (!blob && !disposed && !storeSignal.aborted && index === priorityIndex && (fetchAttempts.get(index) ?? 0) < 2) {
          blob = await fetchFrame(index, true);
        }
        if (!blob || disposed || storeSignal.aborted || (priorityIndex >= 0 && Math.abs(index - priorityIndex) > limit)) return null;
        let frame: DecodedFrame;
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(blob);
          frame = { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
        } else {
          const url = URL.createObjectURL(blob);
          const image = new Image();
          try {
            image.src = url;
            await image.decode();
            frame = { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => { image.src = ""; } };
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        if (disposed || storeSignal.aborted || (priorityIndex >= 0 && Math.abs(index - priorityIndex) > limit)) {
          frame.release();
          return null;
        }
        decoded.set(index, frame);
        while (decoded.size > limit) {
          // Keep the requested frame even when older asynchronous work finishes afterwards.
          const oldest = [...decoded.keys()].find((key) => key !== priorityIndex);
          if (oldest === undefined) break;
          decoded.get(oldest)?.release();
          decoded.delete(oldest);
        }
        return decoded.has(index) ? frame : null;
      } catch {
        return null;
      }
  };

  const get = (index: number, priority = false): Promise<DecodedFrame | null> => {
    if (disposed || storeSignal.aborted || index < 0 || index >= paths.length) return Promise.resolve(null);
    if (priority) {
      priorityIndex = index;
      // Obsolete queued work has no decoded resources and can settle immediately.
      for (const [queuedIndex, request] of queued) {
        if (Math.abs(queuedIndex - index) > limit) {
          request.resolve(null);
          queued.delete(queuedIndex);
          pending.delete(queuedIndex);
        }
      }
    }
    const cached = decoded.get(index);
    if (cached) {
      decoded.delete(index);
      decoded.set(index, cached);
      return Promise.resolve(cached);
    }
    const inFlight = pending.get(index);
    if (inFlight) return inFlight.promise;
    let resolve!: Request["resolve"];
    const promise = new Promise<DecodedFrame | null>((settle) => { resolve = settle; });
    const request = { index, promise, resolve };
    pending.set(index, request);
    queued.set(index, request);
    while (queued.size > limit * 2) {
      const oldest = [...queued.keys()].find((key) => key !== priorityIndex);
      if (oldest === undefined) break;
      queued.get(oldest)?.resolve(null);
      queued.delete(oldest);
      pending.delete(oldest);
    }
    pump();
    return promise;
  };

  return {
    get,
    nearest(index: number) {
      let nearestIndex = -1;
      let distance = Infinity;
      for (const key of decoded.keys()) {
        if (Math.abs(key - index) < distance) {
          distance = Math.abs(key - index);
          nearestIndex = key;
        }
      }
      const frame = decoded.get(nearestIndex);
      return frame ? { frame, index: nearestIndex } : null;
    },
    preload() {
      if (!preloadRequest) {
        let next = 0;
        preloadRequest = Promise.all(Array.from({ length: 4 }, async () => {
          while (!disposed && !storeSignal.aborted && next < paths.length) {
            await fetchFrame(next++);
          }
        })).then(() => undefined);
      }
      return preloadRequest;
    },
    dispose() {
      disposed = true;
      signal.removeEventListener("abort", abort);
      controller.abort();
      decoded.forEach((frame) => frame.release());
      decoded.clear();
      blobs.clear();
      fetchAttempts.clear();
      pending.forEach((request) => request.resolve(null));
      pending.clear();
      queued.clear();
    },
  };
}
