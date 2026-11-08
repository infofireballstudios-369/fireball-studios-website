import { Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactForm } from "@/components/ui/ContactForm";
import { contactEmail, contactPhone, phoneLink } from "@/lib/site";
import { routeMetadata } from "@/lib/metadata";

export const metadata = routeMetadata("/contact");

export default function ContactPage() {
  return (
    <main id="main">
      <PageHeader path="/contact" eyebrow="Start a conversation" title="Tell us what you’re imagining." description="A few details are all we need to start a conversation about your next visualisation project." image="/posters/product-detail.webp" />
      <section className="section section-pad">
        <div className="contact-methods">
          <a href={"mailto:" + contactEmail}><Mail /><div><span className="small-label">Email the studio</span><p>{contactEmail}</p></div></a>
          <div><MapPin /><div><span className="small-label">Based in</span><p>United Kingdom</p></div></div>
          <a href={phoneLink}><Phone /><div><span className="small-label">Call the studio</span><p>{contactPhone}</p></div></a>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
