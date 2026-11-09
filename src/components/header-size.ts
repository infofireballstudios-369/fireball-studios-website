/** Round upwards so fractional layout pixels cannot reduce the reserved space. */
export function measuredHeaderHeight(height: number): number | undefined {
  if (!Number.isFinite(height) || height <= 0 || height > 16384) return;
  return Math.ceil(height);
}

let removeHeaderSizing: (() => void) | undefined;

/** Keep hero clearance in step with wrapping, loaded fonts and viewport changes. */
export function initHeaderSizing(): () => void {
  removeHeaderSizing?.();
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return () => {};
  const root = document.documentElement;
  const previous = root.style.getPropertyValue("--header-height");
  const priority = root.style.getPropertyPriority("--header-height");
  const controller = new AbortController();
  let stopped = false;
  let pending: number | undefined;
  let applied: string | undefined;
  const measure = () => {
    pending = undefined;
    if (stopped) return;
    const height = measuredHeaderHeight(header.getBoundingClientRect().height);
    if (height === undefined) return;
    const next = `${height}px`;
    if (root.style.getPropertyValue("--header-height") === next) return;
    applied = next;
    root.style.setProperty("--header-height", next);
    // The scroll engine rechecks text fit after the reserved area changes.
    window.dispatchEvent(new Event("fireball:header-resize"));
  };
  const schedule = () => {
    if (!stopped && pending === undefined) pending = window.requestAnimationFrame(measure);
  };
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined;
  observer?.observe(header);
  window.addEventListener("resize", schedule, { passive: true, signal: controller.signal });
  window.addEventListener("orientationchange", schedule, { signal: controller.signal });
  void document.fonts?.ready.then(schedule);
  measure();
  removeHeaderSizing = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    controller.abort();
    if (pending !== undefined) window.cancelAnimationFrame(pending);
    // Do not replace a value another owner changed after this component ran.
    if (applied && root.style.getPropertyValue("--header-height") === applied) {
      if (previous) root.style.setProperty("--header-height", previous, priority);
      else root.style.removeProperty("--header-height");
    }
  };
  return removeHeaderSizing;
}
