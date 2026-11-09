import type { BuildConfig } from "./build-config";
import { formsubmitAction } from "./form-endpoint";

/** Grant provider permissions only where a visitor can actually submit a form. */
export function getPageCsp(config: BuildConfig, route: string): string {
  const contact = route === "contact/";
  const formOrigin = contact && config.formProvider === "formsubmit" ? new URL(formsubmitAction).origin
    : contact && config.formProvider === "formspree" && config.formEndpoint ? new URL(config.formEndpoint).origin : "";
  const ajaxOrigin = contact && config.formProvider === "formspree" ? formOrigin : "";
  return [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'", "frame-src 'self' https://player.vimeo.com",
    `connect-src 'self'${ajaxOrigin ? " " + ajaxOrigin : ""}${config.development ? " ws: wss:" : ""}`,
    "object-src 'none'", "base-uri 'none'",
    // Allow the chosen provider's challenge/confirmation paths after the native POST.
    `form-action 'self' mailto:${formOrigin ? " " + formOrigin : ""}`,
  ].join("; ");
}
