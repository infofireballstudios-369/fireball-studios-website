import Image from "next/image";
import Link from "@/components/ui/SiteLink";
import { ArrowUpRight } from "lucide-react";
import { getSeoPage } from "@/lib/seo";
import { getBreadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "./JsonLd";

export function PageHeader({ path, eyebrow, title, description, image = "/posters/1.webp" }: { path: string; eyebrow: string; title: string; description: string; image?: string }) {
  const breadcrumbs = getSeoPage(path)?.breadcrumbs;
  if (!breadcrumbs) throw new RangeError("Add the page to the SEO map before rendering its breadcrumbs: " + path);
  return (
    <section className="page-header">
      <JsonLd data={getBreadcrumbSchema(breadcrumbs)} />
      <Image src={image} alt="" fill priority sizes="100vw" className="page-header-image" />
      <div className="page-header-shade" />
      <div className="page-header-content section-pad">
        <nav className="breadcrumb" aria-label="Breadcrumb"><ol>{breadcrumbs.map((item, index) => <li key={item.path}>{index > 0 && <span aria-hidden="true">/</span>}{index === breadcrumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}</li>)}</ol></nav>
        <p className="eyebrow"><span />{eyebrow}</p><h1>{title}</h1><p className="page-header-description">{description}</p>
      </div>
    </section>
  );
}

export function ContactBanner() {
  return (
    <section className="contact-banner section-pad">
      <div><p className="eyebrow"><span /> Your next project</p><h2>Make the idea<br /><span className="text-muted">impossible to ignore.</span></h2></div>
      <div><p>Competitive rates. A price-match promise.<br />Tell us what you want to bring to life.</p><Link className="button button-amber" href="/contact">Contact for pricing <ArrowUpRight size={18} /></Link></div>
    </section>
  );
}
