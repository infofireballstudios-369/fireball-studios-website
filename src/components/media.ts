export function getVimeoLinks(id: string): { embed: string; fallback: string } | undefined {
  if (!/^\d{6,12}$/.test(id)) return;
  return { embed: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`, fallback: `https://vimeo.com/${id}` };
}

export function getConfiguratorSource(source: string, base: string): string | undefined {
  try {
    const url = new URL(source, base);
    const parent = new URL(base);
    if (url.origin !== parent.origin || !["https:", "http:"].includes(url.protocol) || !url.pathname.endsWith("/experiences/car/fireball-car-configurator2.html") || url.search || url.hash) return;
    return url.href;
  } catch { return; }
}

export type ConfiguratorState = "ready" | "error" | "disposed";

export function readConfiguratorState(event: Pick<MessageEvent, "source" | "origin" | "data">, child: MessageEventSource | null): ConfiguratorState | undefined {
  if (!child || event.source !== child || event.origin !== "null") return;
  const data: unknown = event.data;
  if (!data || typeof data !== "object" || !("channel" in data) || data.channel !== "fireball-configurator" || !("state" in data)) return;
  if (data.state === "ready" || data.state === "error" || data.state === "disposed") return data.state;
}

interface ConfiguratorSessionOptions {
  child: Window;
  report: (state: ConfiguratorState | "timeout") => void;
  schedule?: (callback: () => void, delay: number) => () => void;
}

/** A sandboxed child has an opaque origin, so commands carry no visitor data. */
export function createConfiguratorSession({ child, report, schedule = (callback, delay) => {
  const timer = window.setTimeout(callback, delay);
  return () => window.clearTimeout(timer);
} }: ConfiguratorSessionOptions) {
  let closed = false;
  const cancelTimer = schedule(() => { if (!closed) report("timeout"); }, 45000);
  const send = (command: "pause" | "dispose", paused?: boolean) => {
    if (closed) return;
    child.postMessage({ channel: "fireball-configurator", command, ...(command === "pause" ? { paused } : {}) }, "*");
  };
  return {
    receive(event: Pick<MessageEvent, "source" | "origin" | "data">) {
      if (closed) return;
      const state = readConfiguratorState(event, child);
      if (!state) return;
      cancelTimer();
      report(state);
    },
    pause(paused: boolean) { send("pause", paused); },
    dispose() {
      if (closed) return;
      send("dispose");
      closed = true;
      cancelTimer();
    },
  };
}

function showDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function hideDialog(dialog: HTMLDialogElement): void {
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

let removeMediaListeners: (() => void) | undefined;

/** No iframe or external media request is created until a launch button is used. */
export function initMedia(): () => void {
  removeMediaListeners?.();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let closeActive: (restoreFocus?: boolean) => void = () => {};
  const filmDialog = document.querySelector<HTMLDialogElement>("[data-film-dialog]");
  const filmStage = filmDialog?.querySelector<HTMLElement>("[data-film-stage]");
  const filmStatus = filmDialog?.querySelector<HTMLElement>("[data-film-status]");
  const fallback = filmDialog?.querySelector<HTMLAnchorElement>("[data-vimeo-fallback]");
  let filmTrigger: HTMLButtonElement | undefined;
  let filmFrame: HTMLIFrameElement | undefined;
  let filmTimer: number | undefined;
  const closeFilm = (restoreFocus = true) => {
    window.clearTimeout(filmTimer);
    filmFrame = undefined;
    filmStage?.replaceChildren();
    if (filmDialog) { hideDialog(filmDialog); filmDialog.dataset.state = "idle"; }
    if (restoreFocus) filmTrigger?.focus();
    filmTrigger = undefined;
  };

  document.querySelectorAll<HTMLButtonElement>("[data-video-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      const links = getVimeoLinks(button.dataset.videoId ?? "");
      if (!links || !filmDialog || !filmStage) return;
      closeActive(false);
      closeActive = closeFilm;
      filmTrigger = button;
      if (fallback) fallback.href = links.fallback;
      filmDialog.dataset.state = "loading";
      if (filmStatus) filmStatus.textContent = "Loading the film from Vimeo…";
      const iframe = document.createElement("iframe");
      filmFrame = iframe;
      iframe.className = "film-frame";
      iframe.title = button.dataset.videoTitle || "Fireball Studios visualisation film";
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.addEventListener("load", () => {
        if (filmFrame !== iframe) return;
        window.clearTimeout(filmTimer);
        filmDialog.dataset.state = "ready";
        if (filmStatus) filmStatus.textContent = "If playback is unavailable, open the film on Vimeo using the link below.";
      }, { once: true });
      const failed = () => {
        if (filmFrame !== iframe) return;
        window.clearTimeout(filmTimer);
        filmDialog.dataset.state = "error";
        if (filmStatus) filmStatus.textContent = "Vimeo could not finish loading. Check your connection, or open the film on Vimeo using the link below.";
      };
      iframe.addEventListener("error", failed, { once: true });
      filmTimer = window.setTimeout(failed, 15000);
      iframe.src = links.embed;
      filmStage.replaceChildren(iframe);
      showDialog(filmDialog);
    }, options);
  });
  filmDialog?.querySelector("[data-film-close]")?.addEventListener("click", () => closeFilm(), options);
  filmDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeFilm(); }, options);
  filmDialog?.addEventListener("click", (event) => { if (event.target === filmDialog) closeFilm(); }, options);

  const configurator = document.querySelector<HTMLElement>("[data-configurator]");
  const configDialog = document.querySelector<HTMLDialogElement>("[data-configurator-dialog]");
  const configStage = configDialog?.querySelector<HTMLElement>("[data-configurator-stage]");
  const configStatus = configDialog?.querySelector<HTMLElement>("[data-configurator-status]");
  const launch = configurator?.querySelector<HTMLButtonElement>("[data-configurator-launch]");
  const standalone = document.querySelector<HTMLAnchorElement>("[data-configurator-standalone]");
  let session: ReturnType<typeof createConfiguratorSession> | undefined;
  let configFrame: HTMLIFrameElement | undefined;
  const closeConfigurator = (restoreFocus = true) => {
    session?.dispose();
    session = undefined;
    configFrame = undefined;
    configStage?.replaceChildren();
    if (configDialog) { hideDialog(configDialog); configDialog.dataset.state = "idle"; }
    launch?.setAttribute("aria-expanded", "false");
    if (restoreFocus) launch?.focus();
  };
  const syncVisibility = () => session?.pause(document.hidden);
  launch?.addEventListener("click", () => {
    const source = getConfiguratorSource(configurator?.dataset.src ?? "", window.location.href);
    if (!source || !configDialog || !configStage) return;
    closeActive(false);
    closeActive = closeConfigurator;
    if (standalone) { standalone.href = source; standalone.rel = "noopener noreferrer"; }
    launch.setAttribute("aria-expanded", "true");
    configDialog.dataset.state = "loading";
    if (configStatus) configStatus.textContent = "Preparing the interactive studio. The model loads only when launched and may take a moment…";
    const iframe = document.createElement("iframe");
    configFrame = iframe;
    iframe.className = "configurator-frame";
    iframe.title = "Fireball Studios interactive car configurator";
    iframe.setAttribute("sandbox", "allow-scripts allow-pointer-lock");
    iframe.allow = "fullscreen";
    iframe.allowFullscreen = true;
    // Keep the parent origin available to the child's checked message bridge.
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = source;
    configStage.replaceChildren(iframe);
    showDialog(configDialog);
    if (!iframe.contentWindow) {
      if (configStatus) configStatus.textContent = "The studio could not open. Please use the standalone configurator link.";
      return;
    }
    session = createConfiguratorSession({
      child: iframe.contentWindow,
      report: (state) => {
        configDialog.dataset.state = state === "ready" ? "ready" : "error";
        if (configStatus) configStatus.textContent = state === "ready"
          ? "The studio is ready. Drag to rotate the vehicle and use the controls to customise its finish."
          : "The studio could not finish loading. Close and launch it again, or try the standalone link. Your browser needs WebGL support.";
        if (state === "ready") syncVisibility();
      },
    });
    iframe.addEventListener("error", () => {
      if (configFrame !== iframe) return;
      configDialog.dataset.state = "error";
      if (configStatus) configStatus.textContent = "The studio could not load. Close and launch it again, or use the standalone link.";
    }, { once: true });
  }, options);
  window.addEventListener("message", (event) => session?.receive(event), options);
  document.addEventListener("visibilitychange", syncVisibility, options);
  configDialog?.querySelector("[data-configurator-close]")?.addEventListener("click", () => closeConfigurator(), options);
  configDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeConfigurator(); }, options);
  configDialog?.addEventListener("click", (event) => { if (event.target === configDialog) closeConfigurator(); }, options);
  window.addEventListener("pagehide", () => closeActive(false), options);
  removeMediaListeners = () => { closeActive(false); controller.abort(); };
  return removeMediaListeners;
}
