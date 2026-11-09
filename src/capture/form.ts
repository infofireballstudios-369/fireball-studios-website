import { buildEnquiryMailto, formatEnquiryBrief, validateEnquiry, type Enquiry } from "../components/contact";
import { submitCapture, CaptureSendError } from "./transport";

const fields: (keyof Enquiry)[] = ["name", "phone", "email", "message"];

export function captchaScale(available: number, natural: number): number {
  return Number.isFinite(available) && available > 0 && Number.isFinite(natural) && natural > 0 ? Math.min(1, available / natural) : 1;
}

export function initCaptureForm(): () => void {
  const form = document.querySelector<HTMLFormElement>("[data-capture-form]");
  if (!form) return () => {};
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const draft = form.querySelector<HTMLAnchorElement>("[data-email-draft]");
  const copy = form.querySelector<HTMLButtonElement>("[data-copy-brief]");
  const region = form.querySelector<HTMLElement>("[data-captcha-region]");
  const slot = form.querySelector<HTMLElement>("[data-captcha-slot]");
  const elements = Object.fromEntries(fields.map((name) => [name, form.elements.namedItem(name)])) as Record<keyof Enquiry, HTMLInputElement | HTMLTextAreaElement | null>;
  const read = () => Object.fromEntries(fields.map((name) => [name, elements[name]?.value ?? ""])) as unknown as Enquiry;
  const announce = (text: string) => { if (status) status.textContent = text; };
  const updateDraft = () => { if (draft) draft.href = buildEnquiryMailto(read()); };
  let sending = false;
  let acceptedBrief: string | undefined;
  let pending: number | undefined;
  const fitCaptcha = () => {
    pending = undefined;
    const frame = region?.querySelector<HTMLIFrameElement>("iframe");
    const natural = Number(frame?.getAttribute("width")) || frame?.offsetWidth || 0;
    if (slot && region) slot.style.setProperty("--captcha-scale", String(captchaScale(region.clientWidth, natural)));
  };
  const scheduleFit = () => {
    if (pending === undefined) pending = window.requestAnimationFrame(fitCaptcha);
  };
  const resize = typeof ResizeObserver === "function" ? new ResizeObserver(scheduleFit) : undefined;
  if (region) resize?.observe(region);
  const mutations = typeof MutationObserver === "function" ? new MutationObserver(scheduleFit) : undefined;
  if (region) mutations?.observe(region, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleFit, { passive: true, signal: controller.signal });
  scheduleFit();
  form.noValidate = true;
  if (submit) submit.disabled = false;
  form.removeAttribute("aria-busy");
  if (copy) copy.hidden = false;
  updateDraft();
  form.addEventListener("input", updateDraft, options);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const result = validateEnquiry(read());
    fields.forEach((name) => {
      elements[name]?.setAttribute("aria-invalid", String(Boolean(result.errors[name])));
      const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (error) error.textContent = result.errors[name] ?? "";
    });
    const invalid = fields.find((name) => result.errors[name]);
    if (invalid) { announce("Please check the highlighted details. Your brief has been kept."); elements[invalid]?.focus(); return; }
    const honeypot = form.elements.namedItem("website") as HTMLInputElement | null;
    if (honeypot?.value) { announce("The form could not be submitted. Your brief has been kept; please use the direct email alternative."); return; }
    const brief = formatEnquiryBrief(result.values);
    if (acceptedBrief === brief) { announce("This enquiry has already been submitted to the form service. Email the studio directly with any follow-up."); return; }
    const captcha = form.elements.namedItem("g-recaptcha-response") as HTMLTextAreaElement | null;
    if (!captcha?.value.trim()) { announce("Complete the security check before sending. If it does not load, use the direct email alternative."); region?.focus(); return; }
    fields.forEach((name) => { if (elements[name]) elements[name]!.value = result.values[name]; });
    sending = true;
    if (submit) submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    announce("Submitting your enquiry to the studio’s form service…");
    try {
      await submitCapture(form.getAttribute("action") || "/thanks/", new FormData(form), { currentUrl: window.location.href, signal: controller.signal });
      if (controller.signal.aborted) return;
      acceptedBrief = brief;
      announce("Your enquiry has been submitted to our form service. This acknowledgement does not confirm email delivery. Your brief remains here for reference.");
      window.dispatchEvent(new Event("fireball:capture-submitted"));
    } catch (error) {
      if (!controller.signal.aborted) announce(`${error instanceof CaptureSendError && error.reason === "limit" ? "The form service has reached a temporary limit." : "We could not confirm that your enquiry was submitted."} Your brief has been kept. Please email the studio or copy your brief below.`);
    } finally {
      sending = false;
      if (submit) submit.disabled = false;
      form.removeAttribute("aria-busy");
      // A token may have been consumed even when the network acknowledgement was lost.
      try { (window as Window & { grecaptcha?: { reset: () => void } }).grecaptcha?.reset(); } catch { /* The provider may still be loading. */ }
    }
  }, options);
  copy?.addEventListener("click", async () => {
    const brief = formatEnquiryBrief(read());
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(brief);
      announce("Brief copied. Paste it into an email to info@fireballstudios.co.uk.");
    } catch {
      let fallback = form.querySelector<HTMLTextAreaElement>("[data-copy-fallback]");
      if (!fallback) {
        fallback = document.createElement("textarea"); fallback.dataset.copyFallback = ""; fallback.className = "brief-copy-fallback";
        fallback.readOnly = true; fallback.rows = 7; fallback.setAttribute("aria-label", "Project brief to copy into an email"); form.append(fallback);
      }
      fallback.value = brief; fallback.focus(); fallback.select();
      announce("Your brief is selected below. Copy it and email info@fireballstudios.co.uk.");
    }
  }, options);
  return () => {
    controller.abort(); resize?.disconnect(); mutations?.disconnect();
    if (pending !== undefined) window.cancelAnimationFrame(pending);
  };
}
