import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SequencePlayer } from "@/components/scroll/SequencePlayer";
import { homeChapters } from "@/lib/homeStory";
import { ServicesOverlay } from "@/components/ui/ServicesOverlay";
import { FaqSection } from "@/components/ui/FaqSection";
import { ContactBanner } from "@/components/ui/PageHeader";
import { FeaturedProjects } from "@/components/ui/FeaturedProjects";
import { featuredProjects } from "@/lib/projectsData";


export default function Home() {
  return (
    <main id="main">
      <SequencePlayer chapters={homeChapters} />
      <ServicesOverlay />
      <section className="section section-pad section-dark">
        <div className="section-heading"><div><p className="eyebrow"><span /> Selected studio studies</p><h2>A glimpse of<br /><span className="text-muted">what’s possible.</span></h2></div><Link className="text-link" href="/projects">View all projects <ArrowUpRight size={18} /></Link></div>
        <FeaturedProjects projects={featuredProjects} />
      </section>
      <section className="pricing-strip section-pad"><div><span className="eyebrow"><span /> A fair price for your vision</span><h2>Competitive rates.<br />A price-match promise.</h2></div><div><p>Have a lower quote for the same scope and deliverables? Share it with us and we’ll match it.</p><Link className="button button-amber" href="/contact">Contact for pricing <ArrowUpRight size={17} /></Link></div></section>
      <FaqSection />
      <ContactBanner />
    </main>
  );
}
