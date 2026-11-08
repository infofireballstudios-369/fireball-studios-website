import Image from "next/image";
import Link from "@/components/ui/SiteLink";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { JsonLd } from "@/components/ui/JsonLd";
import { industries } from "@/lib/industriesData";
import { getServiceSchema } from "@/lib/schema";
import { routeMetadata } from "@/lib/metadata";

export const metadata = routeMetadata("/industries");

export default function IndustriesPage() {
  return (
    <main id="main">
      <JsonLd data={industries.map((industry) => getServiceSchema(industry.name + " visualisation", industry.description, "/industries#" + industry.id))} />
      <PageHeader path="/industries" eyebrow="Industries & expertise" title="Your world. A new perspective." description="Different industries. Different audiences. The same care for a clear, compelling visual story." image="/gallery/2/2.4.webp" />
      <section className="section section-pad industry-list">
        {industries.map((industry, index) => (
          <article className="industry-row" id={industry.id} key={industry.id}>
            <div className="industry-visual">
              <Image src={industry.image} alt={industry.imageAlt} fill sizes="(max-width:800px) 90vw, 43vw" />
              <span className="industry-index">0{index + 1}</span>
            </div>
            <div className="industry-copy">
              <p className="eyebrow"><span />{industry.audience}</p>
              <h2>{industry.title}</h2>
              <h3>{industry.answer}</h3>
              <p>{industry.description}</p>
              <ul className="feature-list">{industry.benefits.map((item) => <li key={item}>{item}</li>)}</ul>
              <nav className="industry-project-links" aria-label={industry.name + " studio studies"}>
                <span className="small-label">Explore the work</span>
                {industry.projects.map((project) => (
                  <Link className="text-link" href={"/projects/" + project.slug} key={project.slug}>
                    {project.interactive ? "Explore the car configurator" : project.title}<ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </nav>
              <Link className="text-link" href="/contact">{industry.enquiryLabel}<ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </section>
      <section className="pricing-strip section-pad"><div><p className="eyebrow"><span /> Clear scope. Competitive pricing.</p><h2>Your brief deserves<br />our best rate.</h2></div><div><p>We quote for the work you actually need. Share a lower comparable quote for the same scope and deliverables and we’ll match it.</p><Link className="button button-amber" href="/contact">Contact for pricing <ArrowUpRight size={17} /></Link></div></section>
      <ContactBanner />
    </main>
  );
}
