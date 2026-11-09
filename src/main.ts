import { initNavigation } from "./components/navigation";
import { initFilters } from "./components/filters";
import { initMedia } from "./components/media";
import { initContact } from "./components/contact";
import { initGalleries } from "./components/gallery";

let generation = 0;
let disposers: (() => void)[] = [];
function start() {
  const current = ++generation;
  document.documentElement.classList.add("has-js");
  disposers = [initNavigation(), initFilters(), initMedia(), initContact(), initGalleries()];
  if (document.querySelector("[data-story]")) {
    void import("./components/scroll-story").then(async ({ initScrollStory }) => {
      if (current !== generation) return;
      const dispose = await initScrollStory();
      if (current !== generation) dispose(); else disposers.push(dispose);
    }).catch(() => {
      const status = document.querySelector<HTMLElement>("[data-story-loading]");
      if (status && current === generation) { status.hidden = false; status.textContent = "The still views are available. Scroll animation could not load."; }
    });
  }
  // Content is visible by default; motion is an optional enhancement.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((entry) => { entry.classList.add("will-reveal"); observer.observe(entry); });
    disposers.push(() => observer.disconnect());
  }
}
function stop() { generation++; disposers.forEach((dispose) => dispose()); disposers = []; }
start();
window.addEventListener("pagehide", stop);
// Browser Back may restore a frozen page rather than execute its module again.
window.addEventListener("pageshow", (event) => { if (event.persisted) start(); });
