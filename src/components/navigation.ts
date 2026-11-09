let removeNavigationListeners: (() => void) | undefined;

export function initNavigation(): () => void {
  removeNavigationListeners?.();
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const navigation = document.querySelector<HTMLElement>("[data-navigation]");
  if (!header || !toggle || !navigation) return () => {};
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const setOpen = (open: boolean, restoreFocus = false) => {
    toggle.setAttribute("aria-expanded", String(open));
    navigation.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    if (!open && restoreFocus) toggle.focus();
  };
  setOpen(false);
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"), options);
  navigation.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) setOpen(false);
  }, options);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setOpen(false, true);
  }, options);
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target as Node)) setOpen(false);
  }, options);
  const viewport = window.matchMedia("(min-width: 900px)");
  viewport.addEventListener("change", () => setOpen(false), options);
  const syncScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  syncScroll();
  window.addEventListener("scroll", syncScroll, { ...options, passive: true });
  removeNavigationListeners = () => { controller.abort(); setOpen(false); };
  return removeNavigationListeners;
}
