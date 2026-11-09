export type DecodedFrame = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

type FrameStoreOptions = {
  /** Bound stalled requests; a shorter value also permits deterministic network tests. */
  fetchTimeoutMs?: number;
  /** Approximate RGBA memory retained after decoding; larger frames evict more neighbours. */
  maxDecodedBytes?: number;
  decodeConcurrency?: 1 | 2;
  /** Known source dimensions let the scheduler reserve memory before decoding large frames. */
  expectedFrameBytes?: number;
};

/** Fetch requested frames only, retaining a bounded cache of decoded images. */
export function createFrameStore(paths: string[], signal: AbortSignal, cacheSize = 14, options: FrameStoreOptions = {}) {
  if (!Number.isInteger(cacheSize) || cacheSize < 1) throw new RangeError("cacheSize must be a positive integer");
  const fetchTimeoutMs = options.fetchTimeoutMs ?? 8_000;
  if (!Number.isFinite(fetchTimeoutMs) || fetchTimeoutMs <= 0) throw new RangeError("fetchTimeoutMs must be positive and finite");
  const maxDecodedBytes = options.maxDecodedBytes ?? 48 * 1024 * 1024;
  if (!Number.isFinite(maxDecodedBytes) || maxDecodedBytes <= 0) throw new RangeError("maxDecodedBytes must be positive and finite");
  const decodeConcurrency = options.decodeConcurrency ?? 2;
  if (decodeConcurrency !== 1 && decodeConcurrency !== 2) throw new RangeError("decodeConcurrency must be one or two");
  const expectedFrameBytes = options.expectedFrameBytes ?? 0;
  if (!Number.isFinite(expectedFrameBytes) || expectedFrameBytes < 0 || expectedFrameBytes > maxDecodedBytes) throw new RangeError("expectedFrameBytes must fit within the decoded budget");
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
  let decodedBytes = 0;
  let reservedBytes = 0;
  const bytesFor = (frame: DecodedFrame) => frame.width * frame.height * 4;
  const releaseFrame = (index: number) => {
    const frame = decoded.get(index);
    if (!frame) return;
    decodedBytes -= bytesFor(frame);
    frame.release();
    decoded.delete(index);
  };

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
    while (!disposed && !storeSignal.aborted && decoding < decodeConcurrency && queued.size > 0) {
      const candidates = [...queued.values()].reverse();
      const request = priorityIndex < 0 ? candidates[0] : candidates.reduce((nearest, candidate) =>
        Math.abs(candidate.index - priorityIndex) < Math.abs(nearest.index - priorityIndex) ? candidate : nearest);
      const { index } = request;
      while (decodedBytes + reservedBytes + expectedFrameBytes > maxDecodedBytes) {
        const oldest = [...decoded.keys()].find((key) => key !== priorityIndex);
        if (oldest === undefined) break;
        releaseFrame(oldest);
      }
      if (decodedBytes + reservedBytes + expectedFrameBytes > maxDecodedBytes) {
        if (decoding > 0) return;
        // A retained current frame can occupy the full budget; optional neighbours may be skipped.
        queued.delete(index);
        pending.delete(index);
        request.resolve(null);
        continue;
      }
      queued.delete(index);
      decoding++;
      reservedBytes += expectedFrameBytes;
      void decode(index).then((frame) => {
        decoding--;
        reservedBytes -= expectedFrameBytes;
        pending.delete(index);
        request.resolve(frame);
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
        if (disposed || storeSignal.aborted || bytesFor(frame) > maxDecodedBytes || (priorityIndex >= 0 && Math.abs(index - priorityIndex) > limit)) {
          frame.release();
          return null;
        }
        decoded.set(index, frame);
        decodedBytes += bytesFor(frame);
        while (decoded.size > limit || decodedBytes > maxDecodedBytes) {
          // Keep the requested frame even when older asynchronous work finishes afterwards.
          const oldest = [...decoded.keys()].find((key) => key !== priorityIndex);
          if (oldest === undefined) break;
          releaseFrame(oldest);
        }
        return decoded.has(index) ? frame : null;
      } catch {
        return null;
      }
  };

  const get = (index: number, priority = false): Promise<DecodedFrame | null> => {
    if (disposed || storeSignal.aborted || !Number.isInteger(index) || index < 0 || index >= paths.length) return Promise.resolve(null);
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
    dispose() {
      disposed = true;
      signal.removeEventListener("abort", abort);
      controller.abort();
      decoded.forEach((frame) => frame.release());
      decoded.clear();
      decodedBytes = 0;
      blobs.clear();
      fetchAttempts.clear();
      pending.forEach((request) => request.resolve(null));
      pending.clear();
      queued.clear();
    },
  };
}
