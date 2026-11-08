import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyticsPreferencesButton } from "@/components/ui/AnalyticsConsent";
import { contactEmail } from "@/lib/site";
import { routeMetadata } from "@/lib/metadata";
export const metadata = routeMetadata("/privacy");

export default function PrivacyPage() {
  return <main id="main">
    <PageHeader path="/privacy" eyebrow="Privacy notice" title="Your enquiry, handled with care." description="Information about the details you share through this website and your analytics choices." />
    <article className="section section-pad legal-copy">
      <p>Last updated: 8 November 2026.</p>
      <h2>Who to contact</h2>
      <p>Fireball Studios uses the information you provide to respond to enquiries about its visualisation services. Questions about your information can be sent to <a href={"mailto:" + contactEmail}>{contactEmail}</a>.</p>
      <h2>What you share</h2>
      <p>The enquiry form collects your name, phone number, email address and project description. Please do not include sensitive personal information or confidential third-party documents in your enquiry.</p>
      <h2>Why the information is used</h2>
      <p>We use these details to understand your request, discuss a potential project and prepare a response. Sending an enquiry does not subscribe you to a marketing mailing list. Enquiry information is kept for the time needed to handle the request and, where a project proceeds, to maintain the relevant project records.</p>
      <h2>Website and delivery services</h2>
      <p>Netlify processes network and request information to host this site and limit abusive submissions. Resend processes enquiry details to deliver email to the studio. On alternative hosting, abuse prevention may use a short-lived hashed network identifier. Choosing to play a Vimeo film connects your browser to Vimeo; its own <a href="https://vimeo.com/privacy">privacy terms</a> then apply.</p>
      <h2>Optional Google Analytics</h2>
      <p>Where analytics is enabled on our live website, we ask for your consent before connecting to Google Analytics. If you reject analytics or make no choice, we do not load its script or send it analytics information. You can use the website and send an enquiry without accepting analytics.</p>
      <p>If you accept, Google Analytics uses cookies, including <code>_ga</code> and a measurement-specific <code>_ga_</code> cookie, to distinguish browsers and understand visits. Information may include the pages visited, visit times, browser and device characteristics, approximate location and a pseudonymous cookie identifier. This is not anonymous data. We use the resulting reports to understand how the website is used.</p>
      <p>Our page-view events contain recognised page addresses and titles, without URL queries or fragments. We do not send names, email addresses, phone numbers, project descriptions or other enquiry fields to analytics. We do not use Google Signals, advertising personalisation, remarketing or user IDs.</p>
      <p>Google processes analytics information and may process it outside the UK. Its <a href="https://policies.google.com/privacy">privacy policy</a> explains its processing and safeguards. Our use of analytics is based on your consent.</p>
      <h2>Saving and changing your choice</h2>
      <p>We store your analytics choice in your browser for up to 90 days, along with the preference version and expiry. This preference does not contain a visitor identifier and is used only to remember your choice. Analytics cookies are configured with a maximum lifetime of 90 days. Clearing browser storage or changing browsers may cause us to ask again.</p>
      <p>When analytics is available, use “Analytics preferences” in the footer to reject it or withdraw an earlier acceptance. Withdrawal stops further analytics collection and removes the analytics cookies we can access. It does not undo information already sent to Google. If your browser cannot save a preference, analytics remains off.</p>
      <AnalyticsPreferencesButton />
      <h2>Your information rights</h2>
      <p>You can contact us to ask about information you have provided, request a correction, or ask for its deletion. We will consider the request and explain any relevant limitations. You can also email the studio directly instead of using the form.</p>
      <h2>Further information</h2>
      <p>The <a href="https://ico.org.uk/for-the-public/">Information Commissioner’s Office</a> provides information about data protection and raising concerns in the UK.</p>
    </article>
  </main>;
}
