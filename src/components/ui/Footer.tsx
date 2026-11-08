import Link from "@/components/ui/SiteLink";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Brand } from "./Brand";
import { JsonLd } from "./JsonLd";
import { AnalyticsPreferencesButton } from "./AnalyticsConsent";
import { contactEmail, contactPhone, phoneLink } from "@/lib/site";
import { siteUrl } from "@/lib/schema";

const links = [
  ["/", "Home"], ["/projects", "Projects"], ["/industries", "Industries"],
  ["/about", "About"], ["/blog", "Blog"], ["/contact", "Contact"],
];
export function Footer() {
  return (
    <footer className="site-footer section-pad">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: "Fireball Studios site navigation", itemListElement: links.map(([href, label], index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "WebPage", name: label, url: siteUrl + href } })) }} />
      <div className="footer-grid">
        <div><Brand footer /><p className="footer-description">Spaces, products and possibilities.<br />Visualised with care.</p></div>
        <nav aria-label="Footer navigation"><span className="small-label">Explore</span>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <div className="footer-contact"><span className="small-label">Let’s talk</span><a href={"mailto:" + contactEmail}><Mail size={15} aria-hidden="true" />{contactEmail}</a><a href={phoneLink}><Phone size={15} aria-hidden="true" />{contactPhone}</a><p><MapPin size={15} aria-hidden="true" />United Kingdom</p><Link className="text-link" href="/contact">Start a project <ArrowUpRight size={16} /></Link></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Fireball Studios. All rights reserved.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="/sitemap.xml">Sitemap</a><AnalyticsPreferencesButton /></div></div>
    </footer>
  );
}
