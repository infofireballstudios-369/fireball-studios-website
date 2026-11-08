import Image from "next/image";
import Link from "@/components/ui/SiteLink";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { JsonLd } from "@/components/ui/JsonLd";
import { VimeoPlayer } from "@/components/ui/VimeoPlayer";
import { ConfiguratorPlayer } from "@/components/ui/ConfiguratorPlayer";
import { getCreativeWorkSchema } from "@/lib/schema";
import { getProject, projectsData } from "@/lib/projectsData";
import { routeMetadata } from "@/lib/metadata";
type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return projectsData.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props) {
  const project = getProject((await params).slug);
  return project ? routeMetadata("/projects/" + project.slug) : {};
}
export default async function ProjectPage({ params }: Props) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return (
    <main id="main">
      <JsonLd data={getCreativeWorkSchema(project)} />
      <PageHeader path={"/projects/" + project.slug} eyebrow={project.category + " / Studio study"} title={project.title} description={project.description} image={project.coverImage} />
      <section className="section section-pad">
        <div className="project-facts"><div><span className="small-label">Client / context</span><p>{project.client}</p></div><div><span className="small-label">Industry</span><p>{project.industry}</p></div><div><span className="small-label">Year</span><p>{project.year}</p></div></div>
        {project.video && <VimeoPlayer key={project.video.id} video={project.video} title={project.title} poster={project.coverImage} posterAlt={project.galleryImages[0]?.alt ?? project.title} className="project-showreel" />}
        {project.interactive && <section id="interactive-experience" aria-label={project.interactive.title}><ConfiguratorPlayer src={project.interactive.src} title={project.interactive.title} poster={project.coverImage} /><p className="model-credits">Vehicle model: <a href="https://sketchfab.com/3d-models/2009-mazda-miata-mx-5-roadster-96056443d55c4afaa90099e9e1d45d9b" target="_blank" rel="noopener noreferrer">2009 Mazda Miata MX-5 Roadster</a> by <a href="https://sketchfab.com/Res1n" target="_blank" rel="noopener noreferrer">Res1n</a>. Wheel collection by <a href="https://sketchfab.com/3d-models/alloy-wheel-rims-free-5e04d32fcb174e3b882857168ddb2059" target="_blank" rel="noopener noreferrer">Imagigoo</a>. Both licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Adapted for this visualisation by Fireball Studios; full credits are also available in the configurator.</p></section>}
        <div className="project-brief"><div><p className="eyebrow"><span /> The brief</p><h2>A study in<br /><span className="text-muted">possibility.</span></h2></div><div><p>{project.brief}</p><ul className="feature-list">{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div></div>
        <div className="metrics-grid">{project.metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span className="small-label">{metric.label}</span></div>)}</div>
        <div className="gallery-grid">{project.galleryImages.map((image) => <figure key={image.src}><Image src={image.src} alt={image.alt} width={1920} height={1080} sizes="(max-width:800px) 90vw, 48vw" /><figcaption>{image.alt}</figcaption></figure>)}</div>
        <Link className="text-link" href="/projects">Back to all projects <ArrowUpRight size={17} /></Link>
      </section>
      <ContactBanner />
    </main>
  );
}
