import type { BuildConfig } from "./build-config";
import { formsubmitAction, getNetlifyFormUrl } from "./form-endpoint";

/** Grant provider permissions only where a visitor can actually submit a form. */
export function getPageCsp(config: BuildConfig, route: string): string {
  const contact = route === "contact/";
  const formOrigin = contact && config.formProvider === "formsubmit" ? new URL(formsubmitAction).origin
    : contact && config.formProvider === "formspree" && config.formEndpoint ? new URL(config.formEndpoint).origin : "";
  const ajaxOrigin = contact && config.formProvider === "formspree" ? formOrigin : "";
  const captureUrl = contact && config.formProvider === "netlify" ? getNetlifyFormUrl(config.netlifyFormUrl) : undefined;
  const captureOrigin = captureUrl ? new URL(captureUrl).origin : "";
  return [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'", `frame-src 'self' https://player.vimeo.com${captureOrigin ? " " + captureOrigin : ""}`,
    `connect-src 'self'${ajaxOrigin ? " " + ajaxOrigin : ""}${config.development ? " ws: wss:" : ""}`,
    "object-src 'none'", "base-uri 'none'",
    // Allow the chosen provider's challenge/confirmation paths after the native POST.
    `form-action 'self' mailto:${formOrigin ? " " + formOrigin : ""}`,
  ].join("; ");
}
