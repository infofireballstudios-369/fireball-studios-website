import { projects } from "./projects";
import { blogPosts } from "./blog";

export interface TopicFocus {
  primaryTopic: string;
  relatedTerms: readonly string[];
  /** Questions guide useful visible content; they do not create hidden FAQ markup. */
  questions: readonly string[];
}
export interface TopicLink { route: string; label: string }
export interface SeoPage extends TopicFocus {
  route: string;
  title: string;
  description: string;
  relatedLinks: readonly TopicLink[];
  directAnswer?: string;
}

export const industryTopics: Readonly<Record<string, TopicFocus & { guide: TopicLink }>> = {
  "real-estate": {
    primaryTopic: "property CGI",
    relatedTerms: ["residential visualisation", "property marketing imagery", "interior rendering"],
    questions: ["How does property CGI help present an unbuilt space?"],
    guide: { route: "blog/how-to-brief-a-property-visualisation/", label: "How to brief a property visualisation" },
  },
  architecture: {
    primaryTopic: "architectural visualisation",
    relatedTerms: ["interior CGI", "daylight visualisation", "architectural walkthrough"],
    questions: ["What can architectural visualisation show?"],
    guide: { route: "blog/stills-animation-or-interactive-tour/", label: "Choose between stills, film and an interactive tour" },
  },
  automotive: {
    primaryTopic: "automotive visualisation",
    relatedTerms: ["interactive car configurator", "vehicle CGI", "paint and wheel options"],
    questions: ["What does an interactive car configurator demonstrate?"],
    guide: { route: "blog/stills-animation-or-interactive-tour/", label: "When an interactive presentation is useful" },
  },
  products: {
    primaryTopic: "furniture and product visualisation",
    relatedTerms: ["furniture CGI", "product rendering", "material references", "lifestyle imagery"],
    questions: ["How does furniture CGI help explain a product?"],
    guide: { route: "blog/furniture-visualisation-material-references/", label: "Prepare useful furniture material references" },
  },
};

const staticPages: SeoPage[] = [
  {
    route: "", title: "3D Visualisation Studio UK | Property & Product CGI",
    description: "UK studio creating photorealistic property CGI, architectural visualisation, furniture and automotive imagery, animation and interactive experiences.",
    primaryTopic: "3D visualisation studio UK", relatedTerms: ["photorealistic CGI", "3D animation", "interactive visualisation"],
    questions: ["What does a 3D visualisation studio create?", "Which visualisation format suits my project?"],
    relatedLinks: [{ route: "industries/", label: "Explore our visualisation services" }, { route: "blog/stills-animation-or-interactive-tour/", label: "Choose a visualisation format" }],
  },
  {
    route: "projects/", title: "3D Visualisation Portfolio | Property, Products & Cars",
    description: "Explore property CGI, architectural interiors, furniture renders and a live car configurator through Fireball Studios’ films and original studio studies.",
    primaryTopic: "3D visualisation portfolio", relatedTerms: ["property CGI studies", "furniture renders", "interactive car configurator"],
    questions: ["What does the studio’s visualisation work look like?", "Which studies include a live interactive experience?"],
    relatedLinks: [{ route: "industries/", label: "Find the right service for your industry" }],
  },
  {
    route: "industries/", title: "3D Visualisation Services | Property, Product & Automotive",
    description: "3D visualisation for property developers, architects, furniture makers and automotive brands. Explore still imagery, walkthrough films and interactive options.",
    primaryTopic: "3D visualisation services", relatedTerms: ["property CGI", "architectural visualisation", "product rendering", "automotive CGI"],
    questions: ["How can CGI help present a property or product?", "What can an interactive visualisation show?"],
    relatedLinks: [{ route: "projects/", label: "See the visualisation portfolio" }],
  },
  {
    route: "about/", title: "About Our UK 3D Visualisation Studio",
    description: "Discover Fireball Studios’ approach to 3D imagery, materials and lighting, with a six-stage process from the first brief to review and delivery.",
    primaryTopic: "Fireball Studios visualisation process", relatedTerms: ["UK CGI studio", "design review", "materials and lighting"],
    questions: ["How does a visualisation project progress?", "When can I review the model and imagery?"],
    relatedLinks: [{ route: "blog/how-to-brief-a-property-visualisation/", label: "Prepare a useful visualisation brief" }],
  },
  {
    route: "blog/", title: "3D Visualisation Guides & Studio Insights",
    description: "Practical guides to property CGI briefs, stills versus animation, furniture material references and the studio’s original spaceship concept.",
    primaryTopic: "3D visualisation guides", relatedTerms: ["CGI briefing", "visualisation formats", "material references", "creative concepts"],
    questions: ["How should I brief a CGI project?", "Should I choose stills, animation or an interactive tour?"],
    relatedLinks: [{ route: "projects/", label: "See the studio studies" }],
  },
  {
    route: "contact/", title: "3D Visualisation Enquiries & Project Quotes",
    description: "Discuss your property, furniture, automotive or creative visualisation brief with Fireball Studios. Share your requirements for a tailored project quote.",
    primaryTopic: "3D visualisation project quote", relatedTerms: ["CGI enquiry", "project scope", "visualisation pricing"],
    questions: ["What should I send with a visualisation enquiry?", "How is a project quoted?"],
    relatedLinks: [{ route: "blog/how-to-brief-a-property-visualisation/", label: "What to include in your brief" }],
  },
  {
    route: "privacy/", title: "Privacy Notice", description: "How Fireball Studios’ website, project enquiries and linked visual experiences handle information, with contact details for privacy questions.",
    primaryTopic: "Fireball Studios privacy notice", relatedTerms: ["enquiry information", "linked media services"],
    questions: ["How is my enquiry information handled?"], relatedLinks: [],
  },
  {
    route: "terms/", title: "Website Terms", description: "Information about Fireball Studios’ website, visualisation studies, project enquiries and the rights attached to images and interactive models.",
    primaryTopic: "Fireball Studios website terms", relatedTerms: ["studio studies", "model attribution", "project enquiries"],
    questions: ["What does a project enquiry confirm?"], relatedLinks: [],
  },
  {
    route: "404", title: "Page Not Found", description: "This page could not be found. Return to Fireball Studios and explore the visualisation portfolio, services and studio journal.",
    primaryTopic: "missing page", relatedTerms: [], questions: [], relatedLinks: [{ route: "", label: "Return to the studio" }],
  },
  {
    route: "blog/automotive-visualisation-brief/", title: "Studio Article Moved", description: "Read the original Fireball Studios spaceship concept visualisation at its current studio journal address.",
    primaryTopic: "article redirect", relatedTerms: [], questions: [], relatedLinks: [{ route: "blog/spaceship-concept-visualisation/", label: "Read the spaceship concept story" }],
  },
];

type PageFocus = Omit<SeoPage, "route">;
/** Keep editorial project names in projects.ts; these titles explain each study in search. */
const projectTopics: Record<string, PageFocus> = {
  "garden-residence": {
    title: "The Garden Residence | Property CGI Study",
    description: "Explore an open-plan residential interior through property CGI, natural light, considered materials and a short film in this Fireball Studios concept study.",
    primaryTopic: "residential interior CGI", relatedTerms: ["property visualisation", "open-plan interior", "material and lighting study"],
    questions: ["How can property CGI communicate the feel of an interior?"],
    relatedLinks: [{ route: "industries/#real-estate", label: "Property visualisation services" }, { route: "blog/how-to-brief-a-property-visualisation/", label: "How to brief a property visualisation" }],
  },
  "living-in-light": {
    title: "Living in Light | Architectural Visualisation",
    description: "A studio study of architectural visualisation, showing how daylight, colour, fabric and composition shape the atmosphere of a residential living space.",
    primaryTopic: "architectural interior visualisation", relatedTerms: ["daylight study", "interior CGI", "materials and colour"],
    questions: ["How do daylight and materials shape an interior visualisation?"],
    relatedLinks: [{ route: "industries/#architecture", label: "Architectural visualisation services" }, { route: "blog/stills-animation-or-interactive-tour/", label: "Choose still imagery, film or a tour" }],
  },
  "lounge-chair-study": {
    title: "An Icon, Reimagined | Furniture CGI Study",
    description: "Furniture CGI showing a lounge chair in studio and lifestyle settings, with original stills and a recorded material-options demonstration.",
    primaryTopic: "furniture CGI study", relatedTerms: ["product rendering", "lounge chair visualisation", "studio and lifestyle imagery"],
    questions: ["How can furniture renders show finish and context?"],
    relatedLinks: [{ route: "industries/#products", label: "Furniture and product visualisation" }, { route: "blog/furniture-visualisation-material-references/", label: "Prepare furniture material references" }],
  },
  "interactive-residence": {
    title: "The Interactive Residence | Property Visualisation",
    description: "A residential CGI study combining original interior views with a recorded interactive walkthrough and material-options demonstration.",
    primaryTopic: "interactive property visualisation study", relatedTerms: ["residential CGI", "recorded walkthrough", "interior material options"],
    questions: ["How can an interactive property presentation show different finishes?"],
    relatedLinks: [{ route: "industries/#real-estate", label: "Property CGI and walkthrough services" }, { route: "blog/stills-animation-or-interactive-tour/", label: "Understand interactive visualisation formats" }],
  },
  "bedroom-retreat": {
    title: "The Bedroom Retreat | Interior Visualisation",
    description: "An atmospheric bedroom visualisation exploring warm light, dark timber and soft furnishings through original CGI stills and a walkthrough demonstration.",
    primaryTopic: "bedroom interior visualisation", relatedTerms: ["residential CGI", "atmospheric lighting", "bedroom walkthrough"],
    questions: ["How can lighting communicate the atmosphere of a bedroom?"],
    relatedLinks: [{ route: "industries/#real-estate", label: "Residential property visualisation" }, { route: "blog/how-to-brief-a-property-visualisation/", label: "Plan the views in your property brief" }],
  },
  "car-configurator": {
    title: "Interactive Car Configurator | Automotive CGI",
    description: "Explore paint, wheel and camera options in Fireball Studios’ live car configurator, an independent automotive study using an attributed Mazda MX-5 model.",
    primaryTopic: "interactive car configurator", relatedTerms: ["automotive visualisation", "vehicle CGI", "paint and wheel choices"],
    questions: ["What visual choices can I explore in the car configurator?"],
    relatedLinks: [{ route: "industries/#automotive", label: "Automotive visualisation services" }, { route: "blog/stills-animation-or-interactive-tour/", label: "When to choose an interactive presentation" }],
  },
};

export const articleTopics: Readonly<Record<string, PageFocus>> = {
  "how-to-brief-a-property-visualisation": {
    title: "How to Brief a Property Visualisation",
    description: "A practical property CGI briefing guide: plans, material references, views, audience, review feedback and the final image formats to agree before production.",
    primaryTopic: "property visualisation brief", relatedTerms: ["property CGI brief", "drawing references", "image deliverables"],
    questions: ["What should a property visualisation brief include?", "How should I organise review feedback?"],
    directAnswer: "A property visualisation brief should explain the audience, intended use and required views, then bring together current drawings, material references, delivery formats and review contacts. Mark unresolved choices so the first images can be reviewed against a clear brief.",
    relatedLinks: [{ route: "industries/#real-estate", label: "Explore property visualisation services" }, { route: "projects/garden-residence/", label: "See The Garden Residence study" }, { route: "blog/stills-animation-or-interactive-tour/", label: "Choose the right visualisation format" }],
  },
  "stills-animation-or-interactive-tour": {
    title: "3D Stills, Animation or an Interactive Tour?",
    description: "Compare still imagery, 3D animation and interactive tours. Choose a visualisation format around the information your audience needs and how they will view it.",
    primaryTopic: "stills vs animation vs interactive tours", relatedTerms: ["3D visualisation formats", "architectural walkthrough", "interactive product presentation"],
    questions: ["When should I choose a still, film or interactive tour?", "How do viewing devices affect the format?"],
    directAnswer: "Choose stills for a clear, composed view; animation when movement explains connections; and an interactive experience when viewers need to inspect viewpoints or compare choices themselves. The right format depends on the audience, the story and the devices used to view it.",
    relatedLinks: [{ route: "projects/interactive-residence/", label: "Watch the Interactive Residence demonstration" }, { route: "projects/car-configurator/", label: "Try the live car configurator" }, { route: "industries/", label: "Explore visualisation services" }],
  },
  "furniture-visualisation-material-references": {
    title: "Furniture CGI | A Material Reference Guide",
    description: "Prepare better furniture CGI references with details of grain, weave, stitching, finishes, lighting and the studio or lifestyle views your product needs.",
    primaryTopic: "furniture visualisation material references", relatedTerms: ["furniture CGI", "product render briefing", "fabric and timber references"],
    questions: ["Which material references help a furniture visualisation?", "How should a product be shown in different settings?"],
    directAnswer: "Useful furniture CGI references show overall dimensions alongside close views of grain, weave, stitching and surface finish. Include approved material variants and explain the lighting and setting, so a studio image and a lifestyle scene present the same product consistently.",
    relatedLinks: [{ route: "projects/lounge-chair-study/", label: "See the lounge chair visualisation study" }, { route: "industries/#products", label: "Furniture and product visualisation services" }, { route: "blog/stills-animation-or-interactive-tour/", label: "Compare visualisation formats" }],
  },
  "spaceship-concept-visualisation": {
    title: "Spaceship Concept Visualisation | A Studio Study",
    description: "Explore an original Fireball Studios spaceship and hangar concept, with practical notes on composition, lighting, scale and cinematic visual storytelling.",
    primaryTopic: "spaceship concept visualisation", relatedTerms: ["cinematic environment", "hangar concept", "composition and scale"],
    questions: ["How does a concept scene communicate scale?", "How can lighting organise an imagined environment?"],
    directAnswer: "This original studio concept uses a cinematic hangar to explore an imagined spacecraft. Repeated structures establish scale, a central composition guides the eye and controlled lighting separates the subject from its surroundings. It is a creative visualisation study, not a commissioned vehicle project.",
    relatedLinks: [{ route: "about/#process", label: "Explore the studio’s visualisation process" }, { route: "blog/stills-animation-or-interactive-tour/", label: "How movement changes a visual story" }, { route: "projects/", label: "See other studio visualisation studies" }],
  },
};

function requiredFocus(map: Readonly<Record<string, PageFocus>>, slug: string): PageFocus {
  const entry = map[slug];
  if (!entry) throw new Error("Add an intentional SEO topic entry for " + slug);
  return entry;
}

/** Metadata is derived from this map; project/article H1s remain in their content manifests. */
export const seoPages: readonly SeoPage[] = [
  ...staticPages,
  ...projects.map((project) => ({ route: "projects/" + project.slug + "/", ...requiredFocus(projectTopics, project.slug) })),
  ...blogPosts.map((post) => ({ route: "blog/" + post.slug + "/", ...requiredFocus(articleTopics, post.slug) })),
];

export function getPageSeo(route: string): SeoPage {
  const page = seoPages.find((entry) => entry.route === route);
  if (!page) throw new Error("No SEO metadata is registered for route: " + route);
  return page;
}
