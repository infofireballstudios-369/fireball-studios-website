export type ProjectCategory = "Real Estate" | "Architecture" | "Automotive" | "Product Design";
export interface Project {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  client: string;
  industry: string;
  sourceAssetId?: SourceAssetId;
  video?: VimeoVideo;
  interactive?: { src: string; title: string };
  coverImage: string;
  galleryImages: { src: string; alt: string }[];
  description: string;
  brief: string;
  features: string[];
  year: number;
  isConcept: boolean;
  metrics: { label: string; value: string }[];
}
import type { SourceAssetId, VimeoVideo } from "@/lib/assetManifest";
