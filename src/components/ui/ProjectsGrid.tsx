"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { projectCategories, type Project, type ProjectCategory } from "@/lib/projectsData";
import { ProjectFilmDialog } from "./ProjectFilmDialog";

function ProjectCard({ project, onWatch }: { project: Project; onWatch: (project: Project) => void }) {
  const [image, setImage] = useState(project.coverImage);
  const images = project.galleryImages;
  const alt = images.find((item) => item.src === image)?.alt ?? project.title;
  return (
    <article className="portfolio-card">
      <div className="portfolio-media">
        <Image src={image} alt={alt} fill sizes="(max-width:800px) 90vw, 45vw" />
        <span className="badge concept-badge">{project.isConcept ? "Studio study" : "Selected work"}</span>
        {project.video && <button className="preview-toggle" type="button" onClick={() => onWatch(project)} aria-label={"Watch film: " + project.title}><Play size={14} aria-hidden="true" /> Watch film</button>}
        {!project.video && project.interactive && <Link className="preview-toggle" href={"/projects/" + project.slug + "#interactive-experience"}>Explore interactive <ArrowUpRight size={14} aria-hidden="true" /></Link>}
        <Link className="project-open" href={"/projects/" + project.slug} aria-label={"View " + project.title}><ArrowUpRight /></Link>
        {images.length > 1 && <div className="gallery-picker" role="group" aria-label={"Gallery views for " + project.title}>{images.map((item, index) => <button key={item.src} type="button" onMouseEnter={() => setImage(item.src)} onClick={() => setImage(item.src)} aria-label={"Show view " + (index + 1) + " of " + project.title} aria-pressed={image === item.src}><Image src={item.src} alt="" width={64} height={40} /></button>)}</div>}
      </div>
      <div className="feature-caption"><div><p className="small-label">{project.category} / {project.year}</p><h3><Link href={"/projects/" + project.slug}>{project.title}</Link></h3></div><span>/{project.id}</span></div>
      <p className="portfolio-summary">{project.description}</p>
    </article>
  );
}

export function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState<ProjectCategory | "All">("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const filtered = projects.filter((project) => category === "All" || project.category === category);


  return (
    <>
      <div className="filter-bar" aria-label="Filter projects by category">{(["All", ...projectCategories] as const).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={item === category}>{item}</button>)}</div>
      <p className="results-count" role="status">{filtered.length} {filtered.length === 1 ? "project" : "projects"}</p>
      {filtered.length > 0 ? <div className="grid-two portfolio-grid">{filtered.map((project) => <ProjectCard project={project} key={project.id} onWatch={setSelected} />)}</div> : <div className="empty-state"><h2>A new perspective starts with a brief.</h2><p>We haven’t published a project in this category yet. Tell us what you want to visualise.</p><Link className="button button-amber" href="/contact">Discuss your project <ArrowUpRight size={17} /></Link></div>}
      <ProjectFilmDialog project={selected} onClose={() => setSelected(null)} />
    </>
  );
}
