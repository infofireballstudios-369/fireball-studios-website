export type ProjectCategory = "Real Estate" | "Architecture" | "Automotive" | "Furniture / Product";
export type PortfolioSourceId = 1 | 2 | 3 | 4 | 5;

export interface Project {
  id: string;
  sourceId?: PortfolioSourceId;
  slug: string;
  title: string;
  category: ProjectCategory;
  cover: string;
  gallery: { src: string; alt: string }[];
  description: string;
  brief: string;
  features: string[];
  year: number;
  videoId?: string;
  interactive?: boolean;
}

export const categories: ProjectCategory[] = ["Real Estate", "Architecture", "Automotive", "Furniture / Product"];

export const projects: Project[] = [
  {
    id: "01", slug: "garden-residence", title: "The Garden Residence",
    category: "Real Estate",
    sourceId: 1, videoId: "1243948791", cover: "images/projects/1/1.4.webp",
    gallery: [
      { src: "images/projects/1/1.4.webp", alt: "Green sofa and marble coffee table beside a charcoal kitchen" },
      { src: "images/projects/1/1.5.webp", alt: "Another viewpoint across the open-plan residential interior" },
      { src: "images/projects/1/1.6.webp", alt: "Residential interior material and lighting study" },
    ],
    description: "An inviting residential interior, brought into focus through natural light, considered materials and a cinematic camera move.",
    brief: "Explore how an open-plan home could feel before it is built. The study combines room-scale views with close attention to furniture, surface finishes and the relationship between the kitchen and living area.",
    features: ["Interior visualisation", "Material and lighting studies", "Cinematic camera sequence"],
    year: 2026,
  },
  {
    id: "02", slug: "living-in-light", title: "Living in Light",
    category: "Architecture",
    sourceId: 2, videoId: "1243948789", cover: "images/projects/2/2.4.webp",
    gallery: [
      { src: "images/projects/2/2.4.webp", alt: "Daylight across a green sofa, cushions and a pink flower arrangement" },
      { src: "images/projects/2/2.5.webp", alt: "Daylight and material study in the living space" },
    ],
    description: "A quiet study of daylight, colour and composition. A slow camera move reveals the detail that gives a room its atmosphere.",
    brief: "Use a restrained interior palette to explore the interaction of light, fabric and furniture. The work is presented as a visual study for discussing spatial character, rather than as a completed client commission.",
    features: ["Interior composition", "Daylight visualisation", "High-resolution still imagery"],
    year: 2026,
  },
  {
    id: "03", slug: "lounge-chair-study", title: "An Icon, Reimagined",
    category: "Furniture / Product",
    sourceId: 5, videoId: "1243948881", cover: "images/projects/5/5.2.webp",
    gallery: [
      { src: "images/projects/5/5.2.webp", alt: "Timber and leather lounge chair in a studio setting" },
      { src: "images/projects/5/5.1.webp", alt: "Lounge chair and ottoman in a warm, naturally lit interior" },
    ],
    description: "Form, finish and context. A furniture visualisation study that pairs studio and lifestyle imagery with a recorded product-options demonstration.",
    brief: "Show the same furniture piece in two visual contexts: a neutral studio and a furnished interior. The accompanying recorded demonstration explores how product options can be presented interactively.",
    features: ["Studio product imagery", "Lifestyle visualisation", "Recorded material-options demonstration"],
    year: 2026,
  },
  {
    id: "04", slug: "interactive-residence", title: "The Interactive Residence",
    category: "Real Estate",
    sourceId: 3, videoId: "1243951425", cover: "images/projects/3/3.4.webp",
    gallery: [
      { src: "images/projects/3/3.4.webp", alt: "Residential living space shown in an interactive material demonstration" },
      { src: "images/projects/3/3.5.webp", alt: "Alternative interior view from the residential visualisation study" },
    ],
    description: "A residential space that invites exploration. Imagery and a recorded interactive demonstration reveal the room, its materials and its possibilities.",
    brief: "Present a home as somewhere to explore. This studio study combines still views with a recorded demonstration of an interactive interior, showing how viewpoints and material options can support a property presentation.",
    features: ["Residential visualisation", "Material options demonstration", "Recorded interactive walkthrough"],
    year: 2026,
  },
  {
    id: "05", slug: "bedroom-retreat", title: "The Bedroom Retreat",
    category: "Real Estate",
    sourceId: 4, videoId: "1243948790", cover: "images/projects/4/4.5.webp",
    gallery: [
      { src: "images/projects/4/4.5.webp", alt: "Warm evening light across a contemporary bedroom and dark timber bed frame" },
      { src: "images/projects/4/4.6.webp", alt: "Another viewpoint of the bedroom with its considered lighting and finishes" },
    ],
    description: "A quieter perspective on the home. Warm light, soft surfaces and dark timber shape an atmospheric bedroom visualisation.",
    brief: "Explore the mood of a residential bedroom through still imagery and a walkthrough film. The study focuses on the relationship between light, furnishings and finishes, giving the space a distinct character.",
    features: ["Bedroom visualisation", "Atmospheric lighting", "Walkthrough demonstration"],
    year: 2026,
  },
  {
    id: "06", slug: "car-configurator", title: "Make It Your Own",
    category: "Automotive",
    interactive: true,
    cover: "images/posters/car-configurator.webp",
    gallery: [{ src: "images/posters/car-configurator.webp", alt: "A studio preview derived from the Mazda MX-5 model used in the configurator" }],
    description: "A live 3D studio for exploring paint, wheels and details. Take a closer look at how a vehicle can become an interactive visual experience.",
    brief: "Make visual choices tangible. This interactive study uses an adapted Mazda MX-5 model to explore paint finishes, wheel styles, camera viewpoints and selected details. Launch the configurator to try the combinations yourself.",
    features: ["Live colour and finish options", "Wheel and detail choices", "Interactive camera controls", "Studio model preview"],
    year: 2026,
  },
];
export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

/** Feature source films 3 and 5 explicitly; portfolio IDs are a separate ordering. */
export const featuredProjects: Project[] = [3, 5].map((sourceId) => {
  const project = projects.find((entry) => entry.sourceId === sourceId);
  if (!project) throw new Error("A featured project is missing from the portfolio manifest.");
  return project;
});
