"use client";

import Link from "@/components/ui/SiteLink";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Send, ShieldCheck } from "lucide-react";
import { contactSchema, type ContactPayload } from "@/lib/contactSchema";
import { contactEmail } from "@/lib/site";

const emptyEnquiry: ContactPayload = { name: "", phone: "", email: "", message: "", website: "" };
const deliveryError = "We couldn’t send your enquiry. Your details are still here; please try again or use email.";

export function ContactForm() {
  const [data, setData] = useState<ContactPayload>(emptyEnquiry);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactPayload, string>>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestRef.current?.abort(); };
  }, []);
  useEffect(() => { if (status === "sent") successRef.current?.focus(); }, [status]);

  const change = <K extends keyof ContactPayload>(key: K, value: ContactPayload[K]) => {
    setData((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestRef.current) return;
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof ContactPayload, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ContactPayload;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (first) document.getElementById("contact-" + first)?.focus();
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setErrors({});
    setNotice("");
    setStatus("idle");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      let result: unknown;
      try { result = await response.json(); } catch { throw new Error(deliveryError); }
      if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true || !response.ok) {
        const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : deliveryError;
        throw new Error(message);
      }
      if (!mountedRef.current) return;
      setStatus("sent");
      setNotice("Your enquiry has been accepted for delivery to the studio. We’ll use the details you provided to respond.");
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus("error");
      setNotice(error instanceof Error && error.name === "TimeoutError" ? "The request timed out. Your details are still here; please try again or use email." : error instanceof Error && error.name !== "AbortError" ? error.message : deliveryError);
    } finally {
      requestRef.current = null;
      if (mountedRef.current) setBusy(false);
    }
  };

  const draft = "mailto:" + contactEmail + "?subject=" + encodeURIComponent("Project enquiry — Fireball Studios") + "&body=" + encodeURIComponent("Name: " + data.name + "\nPhone: " + data.phone + "\nEmail: " + data.email + "\n\nProject description:\n" + data.message);
  const errorFor = (field: keyof ContactPayload) => errors[field] ? <span className="field-error" id={"error-" + field}>{errors[field]}</span> : null;

  if (status === "sent") return <div className="success-panel panel" role="status"><Check size={40} /><h2 ref={successRef} tabIndex={-1}>Let’s bring it to life.</h2><p>{notice}</p><Link className="button button-outline" href="/projects">Explore the work <ArrowRight size={17} /></Link></div>;

  return (
    <>
      <noscript><p className="panel">To discuss your project, please <a href={"mailto:" + contactEmail}>email the studio</a> or call using the contact details above.</p></noscript>
      <div className="contact-form-layout">
        <form onSubmit={submit} action="/api/contact" method="post" noValidate className="enquiry-form contact-compact-form" aria-busy={busy}>
          <h2>What are you imagining?</h2>
          <p className="form-help">Share a few details and we’ll help you take the next step.</p>
          <fieldset className="contact-fields" disabled={busy}>
            <legend className="sr-only">Your project enquiry</legend>
            <div className="form-grid">
              <label htmlFor="contact-name">Name<input id="contact-name" name="name" autoComplete="name" maxLength={100} required value={data.name} onChange={(event) => change("name", event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "error-name" : undefined} />{errorFor("name")}</label>
              <label htmlFor="contact-phone">Phone number<input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} required value={data.phone} onChange={(event) => change("phone", event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "error-phone" : undefined} />{errorFor("phone")}</label>
              <label className="form-wide" htmlFor="contact-email">Email address<input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required value={data.email} onChange={(event) => change("email", event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "error-email" : undefined} />{errorFor("email")}</label>
              <label className="form-wide" htmlFor="contact-message">Project description<textarea id="contact-message" name="message" rows={5} minLength={10} maxLength={4000} required value={data.message} onChange={(event) => change("message", event.target.value)} placeholder="Tell us what you want to bring to life." aria-invalid={!!errors.message} aria-describedby={errors.message ? "error-message" : undefined} />{errorFor("message")}</label>
            </div>
            <div className="honeypot" aria-hidden="true"><label>Leave this field empty<input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={data.website} onChange={(event) => change("website", event.target.value)} /></label></div>
          </fieldset>
          {notice && <div className="form-notice" role="alert"><p>{notice}</p><a href={draft}>Send this enquiry by email instead <ArrowRight size={15} /></a></div>}
          <div className="form-actions"><button type="submit" className="button button-cobalt" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}<Send size={16} /></button></div>
          <p className="form-privacy">We use these details to respond to your enquiry. <Link href="/privacy">Privacy notice</Link>.</p>
        </form>
        <aside className="contact-promise panel">
          <p className="eyebrow"><span /> A fair price for your vision</p>
          <h3>Good ideas deserve<br />a clear quote.</h3>
          <p>Tell us what you have in mind. We’ll discuss the visual approach and provide pricing for your project.</p>
          <div className="price-promise"><ShieldCheck size={24} /><h4>Our price-match promise</h4><p>Share a lower comparable quote for the same scope and deliverables and we’ll match it.</p></div>
          <a className="text-link" href={"mailto:" + contactEmail}>Prefer to email? <ArrowRight size={15} /></a>
        </aside>
      </div>
    </>
  );
}
