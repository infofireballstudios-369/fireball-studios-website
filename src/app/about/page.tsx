import Image from "next/image";
import { Layers3, Sun, Eye } from "lucide-react";
import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { ProcessOverlay } from "@/components/ui/ProcessOverlay";
import { routeMetadata } from "@/lib/metadata";
export const metadata = routeMetadata("/about");
export default function AboutPage() {
  return (
    <main id="main">
      <PageHeader path="/about" eyebrow="About Fireball Studios" title="Curiosity. Craft. A different point of view." description="We create visual experiences that help people connect with spaces and products before they encounter them in the real world." image="/posters/product-detail.webp" />
      <section className="section section-pad about-intro"><div><p className="eyebrow"><span /> A studio for possibilities</p><h2>It starts with<br /><span className="text-muted">your imagination.</span></h2><p className="lead">Fireball Studios focuses on 3D visualisation for real estate, architecture, automotive brands, furniture and products of all kinds.</p><p>Our work brings models, materials, light and composition together into a visual story. Sometimes that story is a single image. Sometimes it is a film, a walkthrough or an interactive experience.</p><p>Our six-step process keeps you involved from the first conversation to delivery. An early design review confirms the model, layout and proposed views before detailed visualisation. A later review focuses on the finished imagery, with time to refine materials, lighting and the final details.</p></div><div className="about-image"><Image src="/gallery/5/5.1.webp" alt="A furniture visualisation study showing timber, leather and natural light" fill sizes="(max-width:800px) 90vw, 43vw" /></div></section>
      <section className="section section-pad section-dark"><div className="section-heading"><div><p className="eyebrow"><span /> What shapes the work</p><h2>Care in the details.<br /><span className="text-muted">Clarity in the story.</span></h2></div></div><div className="grid-three">{[
        { icon: Layers3, title: "Material character", text: "Reference-led surfaces, finishes and textures help each object feel coherent in its setting." },
        { icon: Sun, title: "Considered lighting", text: "Light creates atmosphere and gives the viewer a clear understanding of shape and space." },
        { icon: Eye, title: "An audience-first view", text: "The composition and format follow what your audience needs to understand, explore or compare." },
      ].map(({ icon: Icon, title, text }) => <article className="panel principle-card" key={title}><Icon size={27} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <ProcessOverlay />
      <ContactBanner />
    </main>
  );
}
