export interface Enquiry {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export type EnquiryErrors = Partial<Record<keyof Enquiry, string>>;
const fields: (keyof Enquiry)[] = ["name", "phone", "email", "message"];

/** Keep the brief as plain text; mail headers are fixed and URI encoded. */
export function cleanEnquiry(value: Partial<Enquiry>): Enquiry {
  const plain = (text: string | undefined) => (text ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  return { name: plain(value.name), phone: plain(value.phone), email: plain(value.email), message: plain(value.message) };
}

export function validateEnquiry(input: Partial<Enquiry>): { values: Enquiry; errors: EnquiryErrors; valid: boolean } {
  const values = cleanEnquiry(input);
  const errors: EnquiryErrors = {};
  if (values.name.length < 2 || values.name.length > 100 || /[\r\n]/.test(values.name)) errors.name = "Enter your name, using 2–100 characters.";
  const digits = values.phone.replace(/\D/g, "").length;
  if (values.phone.length > 40 || !/^\+?[\d\s().-]+$/.test(values.phone) || /[\r\n]/.test(values.phone) || digits < 7 || digits > 15) errors.phone = "Enter a phone number with 7–15 digits, including your country code if needed.";
  if (values.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.message.length < 10 || values.message.length > 4000) errors.message = "Describe your project using 10–4,000 characters.";
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

export function formatEnquiryBrief(input: Partial<Enquiry>): string {
  const values = cleanEnquiry(input);
  return `Name: ${values.name}\nPhone: ${values.phone}\nEmail: ${values.email}\n\nProject description:\n${values.message}`;
}

export function buildEnquiryMailto(input: Partial<Enquiry>): string {
  return `mailto:info@fireballstudios.co.uk?subject=${encodeURIComponent("Project enquiry — Fireball Studios")}&body=${encodeURIComponent(formatEnquiryBrief(input))}`;
}

let removeContactListeners: (() => void) | undefined;

/** This static form opens a draft; it does not send or store an enquiry. */
export function initContact(): () => void {
  removeContactListeners?.();
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  if (!form) return () => {};
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const draft = document.querySelector<HTMLAnchorElement>("[data-email-draft]");
  const copy = document.querySelector<HTMLButtonElement>("[data-copy-brief]");
  const elements = Object.fromEntries(fields.map((name) => [name, form.elements.namedItem(name)])) as Record<keyof Enquiry, HTMLInputElement | HTMLTextAreaElement | null>;
  const read = (): Enquiry => Object.fromEntries(fields.map((name) => [name, elements[name]?.value ?? ""])) as unknown as Enquiry;
  const announce = (message: string) => { if (status) status.textContent = message; };
  const updateDraft = () => { if (draft) draft.href = buildEnquiryMailto(read()); };

  form.noValidate = true;
  updateDraft();
  form.addEventListener("input", updateDraft, options);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateEnquiry(read());
    fields.forEach((name) => {
      const field = elements[name];
      const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      field?.setAttribute("aria-invalid", String(Boolean(result.errors[name])));
      if (error) {
        error.textContent = result.errors[name] ?? "";
        error.id ||= `enquiry-${name}-error`;
        const describedBy = new Set((field?.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
        describedBy.add(error.id);
        field?.setAttribute("aria-describedby", [...describedBy].join(" "));
      }
    });
    const firstError = fields.find((name) => result.errors[name]);
    if (firstError) {
      announce("Please check the highlighted details. Your project description has been kept.");
      elements[firstError]?.focus();
      return;
    }
    updateDraft();
    try {
      window.location.href = buildEnquiryMailto(result.values);
      announce("Your email draft is ready. Review and send it in your email app to complete your enquiry. If nothing opens, copy your brief and email info@fireballstudios.co.uk.");
    } catch {
      announce("Your email app could not be opened. Copy your brief and email info@fireballstudios.co.uk.");
    }
  }, options);

  copy?.addEventListener("click", async () => {
    const brief = formatEnquiryBrief(read());
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(brief);
      announce("Brief copied. Paste it into an email to info@fireballstudios.co.uk and send it from your email app.");
    } catch {
      let fallback = form.querySelector<HTMLTextAreaElement>("[data-copy-fallback]");
      if (!fallback) {
        fallback = document.createElement("textarea");
        fallback.dataset.copyFallback = "";
        fallback.className = "brief-copy-fallback";
        fallback.readOnly = true;
        fallback.rows = 8;
        fallback.setAttribute("aria-label", "Project brief to copy into your email");
        form.append(fallback);
      }
      fallback.value = brief;
      fallback.focus();
      fallback.select();
      announce("Your brief is selected below. Copy it using your device’s copy command, then email info@fireballstudios.co.uk.");
    }
  }, options);

  removeContactListeners = () => controller.abort();
  return removeContactListeners;
}
