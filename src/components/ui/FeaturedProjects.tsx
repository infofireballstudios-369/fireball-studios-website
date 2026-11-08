"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import type { Project } from "@/types/portfolio";
import { ProjectFilmDialog } from "./ProjectFilmDialog";

function FeaturedProject({ project, onWatch }: { project: Project; onWatch: (project: Project) => void }) {
  const images = project.galleryImages;
  const [active, setActive] = useState(0);
  const current = Math.min(active, images.length - 1);
  const image = images[current];
  return (
    <article className="feature-project">
      <div className="feature-image">
        <Image src={image.src} alt={image.alt} fill sizes="(max-width:800px) 90vw, 45vw" />
        {project.video && <button className="preview-toggle" type="button" onClick={() => onWatch(project)} aria-label={"Watch film: " + project.title}><Play size={16} aria-hidden="true" />Watch film</button>}
        <Link className="project-open" href={"/projects/" + project.slug} aria-label={"Explore " + project.title}><ArrowUpRight /></Link>
        <div className="gallery-picker featured-gallery-picker" role="group" aria-label={"Views of " + project.title}>
          {images.map((item, index) => <button key={item.src} type="button" onClick={() => setActive(index)} onMouseEnter={() => setActive(index)} aria-label={"Show view " + (index + 1) + " of " + project.title} aria-pressed={current === index}><Image src={item.src} alt="" width={64} height={40} /></button>)}
        </div>
      </div>
      <div className="feature-caption"><div><p className="small-label">{project.category} / Studio study</p><h3><Link href={"/projects/" + project.slug}>{project.title}</Link></h3></div><span>{String(current + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span></div>
    </article>
  );
}

export function FeaturedProjects({ projects }: { projects: Project[] }) {
  const [selected, setSelected] = useState<Project | null>(null);
  return <><div className="grid-two">{projects.map((project) => <FeaturedProject project={project} onWatch={setSelected} key={project.id} />)}</div><ProjectFilmDialog project={selected} onClose={() => setSelected(null)} /></>;
}
