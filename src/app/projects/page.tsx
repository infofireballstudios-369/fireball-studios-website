import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { ProjectsGrid } from "@/components/ui/ProjectsGrid";
import { projectsData } from "@/lib/projectsData";
import { routeMetadata } from "@/lib/metadata";
export const metadata = routeMetadata("/projects");
export default function ProjectsPage() {
  return <main id="main"><PageHeader path="/projects" eyebrow="Selected projects" title="Ideas, made visible." description="A collection of studio studies exploring spaces, products and the experiences around them. Select a category and take a closer look." /><section className="section section-pad"><ProjectsGrid projects={projectsData} /></section><ContactBanner /></main>;
}
