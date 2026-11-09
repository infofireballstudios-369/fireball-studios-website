import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import { getFormEndpoint } from "../src/lib/form-endpoint.ts";
import { readBuildConfig } from "../src/lib/build-config.ts";
import { sendEnquiry, EnquirySendError } from "../src/lib/send-enquiry.ts";
import { buildPages } from "../src/templates/pages.ts";
import { initContact } from "../src/components/contact.ts";

const endpoint = "https://formspree.io/f/abcdefgh";
const values = { name: "Alex Smith", phone: "+44 7405 052555", email: "alex@example.co.uk", message: "Please visualise our new furniture collection." };

test("form configuration restricts providers and preserves an explicit email-draft mode", () => {
  assert.equal(getFormEndpoint(undefined), undefined);
  assert.equal(getFormEndpoint("  " + endpoint + "  "), endpoint);
  assert.equal(readBuildConfig({ FORMSPREE_ENDPOINT: endpoint }, false).formEndpoint, endpoint);
  for (const value of ["http://formspree.io/f/abcdefgh", "https://evil.example/f/abcdefgh", endpoint + "?email=other@example.com", endpoint + "#x", "https://user:secret@formspree.io/f/abcdefgh", "https://formspree.io:443/f/abcdefgh", "https://formspree.io/f/../../x"]) assert.throws(() => getFormEndpoint(value));
  assert.equal(readBuildConfig({}, false).formProvider, "formsubmit");
  assert.throws(() => readBuildConfig({ FORM_PROVIDER: "other" }, false));
  assert.throws(() => readBuildConfig({ FORM_PROVIDER: "formspree" }, false));
  const config = readBuildConfig({ FORM_PROVIDER: "email" }, false);
  const document = parseHTML(buildPages(config).find((page) => page.route === "contact/")!.body).document;
  assert.equal(document.querySelector("form")?.getAttribute("action"), "mailto:info@fireballstudios.co.uk");
  assert.equal(document.querySelector("form")?.hasAttribute("data-form-endpoint"), false);
});

test("automatic and no-JavaScript forms share the configured endpoint and disclose the processor", () => {
  const pages = buildPages(readBuildConfig({ FORMSPREE_ENDPOINT: endpoint }, false));
  const contact = parseHTML(pages.find((page) => page.route === "contact/")!.body).document;
  const form = contact.querySelector("form")!;
  assert.equal(form.getAttribute("action"), endpoint);
  assert.equal(form.getAttribute("data-form-endpoint"), endpoint);
  assert.equal(form.getAttribute("method"), "post");
  assert.match(form.textContent!, /secure hosted form service/);
  assert.ok(contact.querySelector("[data-email-draft]"));
  const privacy = pages.find((page) => page.route === "privacy/")!.body;
  assert.match(privacy, /Formspree.*spam filtering.*email notification/);
  assert.match(privacy, /formspree.io\/legal\/privacy-policy/);
});

test("delivery sends the four enquiry fields with phone and a fixed subject without credentials", async () => {
  let calls = 0;
  await sendEnquiry(endpoint, values, { fetcher: (async (url, options) => {
    calls++;
    assert.equal(url, endpoint);
    assert.equal(options?.method, "POST");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.redirect, "error");
    assert.deepEqual(JSON.parse(options?.body as string), { ...values, _subject: "Project enquiry — Fireball Studios" });
    assert.equal(new Headers(options?.headers).get("Accept"), "application/json");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch });
  assert.equal(calls, 1);
});

test("provider refusal, rate limits, network failure and timeout never become success", async () => {
  for (const [status, reason] of [[422, "rejected"], [429, "limit"], [503, "rejected"]] as const) {
    await assert.rejects(sendEnquiry(endpoint, values, { fetcher: (async () => new Response("{}", { status })) as typeof fetch }), (error: unknown) => error instanceof EnquirySendError && error.reason === reason);
  }
  await assert.rejects(sendEnquiry(endpoint, values, { fetcher: (async () => { throw new Error("offline"); }) as typeof fetch }), (error: unknown) => error instanceof EnquirySendError && error.reason === "network");
  await assert.rejects(sendEnquiry(endpoint, values, { timeoutMs: 5, fetcher: ((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("cancelled"))))) as typeof fetch }), EnquirySendError);
  let calls = 0;
  await assert.rejects(sendEnquiry("https://evil.example", values, { fetcher: (async () => { calls++; return new Response(); }) as typeof fetch }), EnquirySendError);
  assert.equal(calls, 0);
});

test("contact retains entered details, blocks duplicate in-flight sends and reports only acceptance", async () => {
  const { document, Event: DOMEvent } = parseHTML(`<form data-contact-form data-form-endpoint="${endpoint}">${Object.entries(values).map(([key]) => `<input name="${key}"><span data-error-for="${key}"></span>`).join("")}<button type="submit">Send</button><p data-form-status></p><a data-email-draft></a></form>`);
  const form = document.querySelector("form")!;
  const elements = Object.fromEntries(Object.entries(values).map(([key, value]) => { const field = document.querySelector<HTMLInputElement>(`[name="${key}"]`)!; field.value = value; return [key, field]; }));
  Object.defineProperty(form, "elements", { value: { namedItem: (name: string) => elements[name] } });
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  let resolve!: (response: Response) => void;
  let calls = 0;
  globalThis.fetch = (() => { calls++; return new Promise<Response>((done) => { resolve = done; }); }) as typeof fetch;
  let dispose: (() => void) | undefined;
  try {
    dispose = initContact();
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    assert.equal(calls, 1);
    assert.equal(form.getAttribute("aria-busy"), "true");
    assert.match(form.querySelector("[data-form-status]")!.textContent!, /Sending/);
    resolve(new Response("{}", { status: 503 }));
    await new Promise((done) => setTimeout(done, 0));
    assert.match(form.querySelector("[data-form-status]")!.textContent!, /could not confirm.*details have been kept/);
    for (const [key, value] of Object.entries(values)) assert.equal(elements[key].value, value);
    assert.equal(form.hasAttribute("aria-busy"), false);
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    resolve(new Response("{}", { status: 200 }));
    await new Promise((done) => setTimeout(done, 0));
    assert.match(form.querySelector("[data-form-status]")!.textContent!, /accepted by our form service/);
    assert.doesNotMatch(form.querySelector("[data-form-status]")!.textContent!, /delivered|inbox/);
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    assert.equal(calls, 2, "an unchanged accepted brief is not accidentally sent twice");
  } finally {
    dispose?.();
    globalThis.fetch = oldFetch;
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else Reflect.deleteProperty(globalThis, "document");
  }
});

test("no-account sending uses the fixed native provider action and keeps its CAPTCHA", () => {
  const config = readBuildConfig({}, false);
  const page = buildPages(config).find((entry) => entry.route === "contact/")!;
  assert.doesNotMatch(page.body, /_captcha|captcha=false|formsubmit.co\/ajax/);
  const { document, Event: DOMEvent } = parseHTML(page.body);
  const form = document.querySelector<HTMLFormElement>("form")!;
  const elements = Object.fromEntries(Object.entries(values).map(([key, value]) => { const field = document.querySelector<HTMLInputElement>(`[name="${key}"]`)!; field.value = value; return [key, field]; }));
  Object.defineProperty(form, "elements", { value: { namedItem: (name: string) => elements[name] } });
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldFormClass = Object.getOwnPropertyDescriptor(globalThis, "HTMLFormElement");
  let submissions = 0;
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "HTMLFormElement", { configurable: true, value: { prototype: { submit(this: HTMLFormElement) {
    submissions++;
    assert.equal(this, form);
    assert.equal(this.getAttribute("action"), "https://formsubmit.co/info@fireballstudios.co.uk");
  } } } });
  let cleanup: (() => void) | undefined;
  try {
    cleanup = initContact();
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    form.dispatchEvent(new DOMEvent("submit", { cancelable: true }));
    assert.equal(submissions, 1);
    assert.match(form.querySelector("[data-form-status]")!.textContent!, /security check.*not confirmed delivery/);
    cleanup();
    cleanup = initContact();
    assert.equal(form.hasAttribute("aria-busy"), false, "returning from provider does not leave the form busy");
    assert.equal(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, false);
  } finally {
    cleanup?.();
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument); else Reflect.deleteProperty(globalThis, "document");
    if (oldFormClass) Object.defineProperty(globalThis, "HTMLFormElement", oldFormClass); else Reflect.deleteProperty(globalThis, "HTMLFormElement");
  }
});

test("CSP grants only the selected contact provider, including native challenge redirects", async () => {
  const { getPageCsp } = await import("../src/lib/security.ts");
  for (const provider of ["formsubmit", "formspree", "email"] as const) {
    const config = readBuildConfig({ FORM_PROVIDER: provider, ...(provider === "formspree" ? { FORMSPREE_ENDPOINT: endpoint } : {}) }, false);
    for (const route of ["", "projects/", "blog/spaceship-concept-visualisation/", "privacy/"]) assert.doesNotMatch(getPageCsp(config, route), /formsubmit\.co|formspree\.io/);
    const policy = getPageCsp(config, "contact/");
    const directives = new Map(policy.split("; ").map((part) => [part.split(" ")[0], part]));
    assert.equal(directives.get("script-src"), "script-src 'self'");
    assert.doesNotMatch(policy, /unsafe-eval|\*/);
    if (provider === "formsubmit") {
      assert.equal(directives.get("connect-src"), "connect-src 'self'");
      assert.equal(directives.get("form-action"), "form-action 'self' mailto: https://formsubmit.co");
    } else if (provider === "formspree") assert.equal(directives.get("connect-src"), "connect-src 'self' https://formspree.io");
    else assert.doesNotMatch(policy, /formsubmit\.co|formspree\.io/);
  }
});
