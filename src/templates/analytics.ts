const escapeAttribute = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** A nonmodal preference region: runtime reveals it only when measurement is eligible. */
export function analyticsPanel(prefix: string): string {
  if (!/^(?:\.\/|(?:\.\.\/)*)$/.test(prefix)) throw new Error("Analytics links require a relative page-depth prefix.");
  const privacy = escapeAttribute(prefix + "privacy/");
  return `<section class="analytics-panel" id="analytics-consent-panel" data-analytics-consent hidden aria-labelledby="analytics-consent-heading" aria-describedby="analytics-consent-description" tabindex="-1">
  <div class="analytics-panel-header"><h2 id="analytics-consent-heading">Analytics preferences</h2><button class="analytics-close" type="button" data-analytics-close hidden aria-label="Close analytics preferences">Close</button></div>
  <p id="analytics-consent-description">May we use Google Analytics cookies to understand visits and improve the website? They are optional. We do not enable advertising features.</p>
  <p class="analytics-detail">You can use the website without accepting. We remember your choice in this browser for 90 days. Change it at any time using Analytics preferences in the footer.</p>
  <div class="analytics-choices" role="group" aria-label="Analytics cookie choice"><button class="analytics-choice" type="button" data-analytics-choice="accept">Accept analytics</button><button class="analytics-choice" type="button" data-analytics-choice="reject">Reject analytics</button></div>
  <div class="analytics-options"><a href="${privacy}">Privacy notice</a><button class="analytics-withdraw" type="button" data-analytics-withdraw hidden>Withdraw consent</button></div>
  <p class="analytics-status" data-analytics-status role="status" aria-live="polite" aria-atomic="true"></p>
</section>`;
}

/** Keep a persistent route back to the visitor's saved choice. */
export function analyticsPreferencesButton(): string {
  return '<button class="analytics-settings js-only" type="button" data-analytics-settings hidden aria-controls="analytics-consent-panel" aria-expanded="false">Analytics preferences</button>';
}
