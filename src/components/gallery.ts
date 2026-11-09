export function initGalleries(): () => void {
  const controller = new AbortController();
  for (const gallery of document.querySelectorAll<HTMLElement>("[data-gallery]")) {
    const image = gallery.querySelector<HTMLImageElement>("[data-gallery-image]");
    const buttons = [...gallery.querySelectorAll<HTMLButtonElement>("[data-gallery-thumb]")];
    for (const button of buttons) button.addEventListener("click", () => {
      if (!image || !button.dataset.src) return;
      image.src = button.dataset.src;
      image.alt = button.dataset.alt || "Project view";
      buttons.forEach((entry) => entry.setAttribute("aria-pressed", String(entry === button)));
    }, { signal: controller.signal });
  }
  return () => controller.abort();
}
