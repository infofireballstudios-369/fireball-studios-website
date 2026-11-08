"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { Project } from "@/types/portfolio";
import { VimeoPlayer } from "./VimeoPlayer";

/** One accessible film overlay is shared by home and portfolio cards. */
export function ProjectFilmDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hasFilm = Boolean(project?.video);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!hasFilm || !dialog) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [hasFilm]);
  return (
    <dialog ref={dialogRef} className="project-film-dialog" aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {project?.video && <div className="project-film-dialog-inner"><div className="project-film-dialog-heading"><h2 id={titleId}>{project.title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close film"><X aria-hidden="true" /></button></div><VimeoPlayer key={project.video.id} video={project.video} title={project.title} poster={project.coverImage} playOnOpen /></div>}
    </dialog>
  );
}
