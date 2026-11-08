import { getProject, getProjectBySource } from "./projectsData";
import type { SourceAssetId } from "./assetManifest";
import type { Project } from "@/types/portfolio";

export interface Industry {
  id: string;
  name: string;
  title: string;
  audience: string;
  description: string;
  benefits: string[];
  answer: string;
  image: string;
  imageAlt: string;
  projects: Project[];
  enquiryLabel: string;
}

function sourceProject(id: SourceAssetId): Project {
  const project = getProjectBySource(id);
  if (!project) throw new Error("An industry project is missing from the portfolio manifest.");
  return project;
}

const carConfigurator = getProject("car-configurator");
if (!carConfigurator) throw new Error("The automotive configurator is missing from the portfolio manifest.");

export const industries: Industry[] = [
  {
    id: "real-estate", name: "Real Estate", title: "Help people picture their next place.",
    audience: "Developers & property agents",
    description: "Property visualisation helps buyers and stakeholders understand the appearance and atmosphere of a space before it is complete. Explore our residential studies through considered interior imagery and recorded walkthrough demonstrations.",
    benefits: ["Interior and exterior imagery for property presentations", "Walkthrough films that explain how rooms connect", "Visual material for brochures, websites and launch campaigns"],
    answer: "How does 3D visualisation support property marketing?",
    image: "/gallery/1/1.4.webp", imageAlt: "Green sofa, marble coffee table and kitchen in a residential visualisation",
    projects: [sourceProject(1), sourceProject(3), sourceProject(4)],
    enquiryLabel: "Discuss your property visualisation",
  },
  {
    id: "architecture", name: "Architecture", title: "Communicate the space you have in mind.",
    audience: "Architects & interior designers",
    description: "Architectural visualisation turns plans and references into clear views of light, materials and spatial relationships. Our Living in Light study explores how colour, furnishings and daylight contribute to an interior’s character.",
    benefits: ["Design presentations with considered camera viewpoints", "Material, colour and lighting studies", "360° tours and interactive walkthroughs"],
    answer: "What can an architectural visualisation show?",
    image: "/gallery/2/2.4.webp", imageAlt: "Daylight across a green sofa and flower arrangement in an architectural interior study",
    projects: [sourceProject(2)], enquiryLabel: "Discuss your architectural visualisation",
  },
  {
    id: "automotive", name: "Automotive", title: "Give every choice a new perspective.",
    audience: "Automotive brands",
    description: "Automotive visualisation lets people explore a vehicle’s appearance through imagery and interactive options. Our live car configurator demonstrates paint finishes, wheel choices and camera views using an adapted Mazda MX-5 model in a digital studio.",
    benefits: ["Studio and environment-based vehicle imagery", "Finish, colour and trim visualisation", "Interactive presentations that make visual choices tangible"],
    answer: "What is automotive visualisation used for?",
    image: "/posters/car-configurator.webp", imageAlt: "A studio preview derived from the Mazda MX-5 model used in our car configurator",
    projects: [carConfigurator], enquiryLabel: "Discuss your automotive visualisation",
  },
  {
    id: "products", name: "Product Design", title: "Bring the product into someone’s world.",
    audience: "Furniture & product manufacturers",
    description: "Product visualisation shows shape, finish and context through studio imagery, lifestyle scenes and configurable presentations. Our lounge chair study places the same piece in a studio and an interior, with a recorded demonstration of product options.",
    benefits: ["Catalogue and campaign imagery", "Furniture placed in carefully composed interiors", "Interactive demonstrations of materials and options"],
    answer: "How can CGI help present a product?",
    image: "/gallery/5/5.1.webp", imageAlt: "Lounge chair and ottoman in a warm, naturally lit interior",
    projects: [sourceProject(5)], enquiryLabel: "Discuss your furniture or product visualisation",
  },
];
