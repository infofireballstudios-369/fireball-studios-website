export interface Faq { question: string; answer: string }
export interface ProcessStep { title: string; description: string }
export interface HomeChapter {
  sequenceId: 3 | 6 | 5;
  eyebrow: string;
  title: string;
  description: string;
  features?: string[];
}
export interface Service {
  title: string;
  description: string;
  deliverables: string[];
  image?: string;
}
export interface Industry {
  id: string;
  name: string;
  audience: string;
  title: string;
  description: string;
  benefits: string[];
  image: string;
  imageAlt: string;
  projectSlugs: string[];
}

export const faqs: Faq[] = [
  { question: "What does Fireball Studios create?", answer: "We create photorealistic 3D visualisations, animations and interactive presentations for real estate, architecture, automotive brands, furniture and other products." },
  { question: "How much does a visualisation project cost?", answer: "Pricing depends on the scope, source material and deliverables. Contact us for a tailored quote. If you have a lower comparable quote for the same scope and deliverables, share it with us and we will match it." },
  { question: "What should I send with my enquiry?", answer: "Share your idea, intended audience, required views or animation length, and any plans, models or reference images you have. Tell us your preferred timing so we can agree a suitable approach." },
  { question: "Can you create an interactive walkthrough?", answer: "Yes. We can discuss real-time walkthroughs, 360° experiences and product presentations with material or finish options. The format is planned around your audience and the devices they will use." },
  { question: "Do you work with clients outside the UK?", answer: "We welcome enquiries from the UK and internationally. The brief, review stages and delivery requirements can be discussed remotely." },
];

export const process: ProcessStep[] = [
  { title: "Understand", description: "We get to know your idea, audience and the outcome you want to achieve." },
  { title: "Design & Model", description: "We prepare the scene, model the forms and develop the visual direction." },
  { title: "Design Review", description: "We review the model, layout and proposed views together before detailed visualisation begins." },
  { title: "Visualise", description: "Lighting, materials and composition bring the concept into focus." },
  { title: "Review & Refine", description: "We review the imagery together and refine the lighting, finishes and final details." },
  { title: "Deliver", description: "We prepare the agreed imagery or experience for its intended use." },
];

export const homeChapters: HomeChapter[] = [
  {
    sequenceId: 3,
    eyebrow: "Imagine the experience",
    title: "Photorealistic 3D Visualisation That Brings Your Ideas to Life",
    description: "Fireball Studios creates imagery, animation and interactive experiences for property, automotive, furniture and products. Your vision, made visible.",
  },
  {
    sequenceId: 6,
    eyebrow: "Beyond the everyday",
    title: "Give imagination a world of its own.",
    description: "Our original spaceship concept explores light, atmosphere and scale. A studio study in bringing an imagined world into view.",
    features: ["Creative concepts", "Cinematic environments", "Visual storytelling"],
  },
  {
    sequenceId: 5,
    eyebrow: "Every detail, explored",
    title: "A closer connection to your product.",
    description: "Show the finish. Explore the options. Turn furniture, vehicles and product ideas into visual experiences that invite a closer look.",
    features: ["Product visualisation", "Material options", "Interactive presentations"],
  },
];

export const services: Service[] = [
  {
    title: "Architecture & property",
    description: "Interior and exterior imagery that helps people understand the place before it exists.",
    deliverables: ["Interior and exterior stills", "Architectural walkthrough films", "Material and lighting studies"],
    image: "images/projects/1/1.4.webp",
  },
  {
    title: "Furniture & products",
    description: "Furniture and product imagery with careful attention to shape, finish and context.",
    deliverables: ["Studio product imagery", "Lifestyle scenes", "Material and finish variants"],
    image: "images/projects/5/5.2.webp",
  },
  {
    title: "Automotive visualisation",
    description: "Visual storytelling for vehicles, accessories and automotive concepts.",
    deliverables: ["Vehicle imagery", "Colour and finish studies", "Interactive visual presentations"],
    image: "images/posters/car-configurator.webp",
  },
  {
    title: "Interactive experiences",
    description: "Interactive tours and product demonstrations that put the visitor in control.",
    deliverables: ["Real-time walkthroughs", "360° experiences", "Product and material options"],
    image: "images/projects/3/3.4.webp",
  },
];

export const industries: Industry[] = [
  {
    id: "real-estate", name: "Real Estate", title: "Help people picture their next place.",
    audience: "Developers & property agents",
    description: "Property visualisation helps buyers and stakeholders understand the appearance and atmosphere of a space before it is complete. Explore our residential studies through considered interior imagery and recorded walkthrough demonstrations.",
    benefits: ["Interior and exterior imagery for property presentations", "Walkthrough films that explain how rooms connect", "Visual material for brochures, websites and launch campaigns"],
    image: "images/projects/1/1.4.webp", imageAlt: "Green sofa, marble coffee table and kitchen in a residential visualisation",
    projectSlugs: ["garden-residence", "interactive-residence", "bedroom-retreat"],
  },
  {
    id: "architecture", name: "Architecture", title: "Communicate the space you have in mind.",
    audience: "Architects & interior designers",
    description: "Architectural visualisation turns plans and references into clear views of light, materials and spatial relationships. Our Living in Light study explores how colour, furnishings and daylight contribute to an interior’s character.",
    benefits: ["Design presentations with considered camera viewpoints", "Material, colour and lighting studies", "360° tours and interactive walkthroughs"],
    image: "images/projects/2/2.4.webp", imageAlt: "Daylight across a green sofa and flower arrangement in an architectural interior study",
    projectSlugs: ["living-in-light"],
  },
  {
    id: "automotive", name: "Automotive", title: "Give every choice a new perspective.",
    audience: "Automotive brands",
    description: "Automotive visualisation lets people explore a vehicle’s appearance through imagery and interactive options. Our live car configurator demonstrates paint finishes, wheel choices and camera views using an adapted Mazda MX-5 model in a digital studio.",
    benefits: ["Studio and environment-based vehicle imagery", "Finish, colour and trim visualisation", "Interactive presentations that make visual choices tangible"],
    image: "images/posters/car-configurator.webp", imageAlt: "A studio preview derived from the Mazda MX-5 model used in our car configurator",
    projectSlugs: ["car-configurator"],
  },
  {
    id: "products", name: "Furniture & products", title: "Bring the product into someone’s world.",
    audience: "Furniture & product manufacturers",
    description: "Product visualisation shows shape, finish and context through studio imagery, lifestyle scenes and configurable presentations. Our lounge chair study places the same piece in a studio and an interior, with a recorded demonstration of product options.",
    benefits: ["Catalogue and campaign imagery", "Furniture placed in carefully composed interiors", "Interactive demonstrations of materials and options"],
    image: "images/projects/5/5.1.webp", imageAlt: "Lounge chair and ottoman in a warm, naturally lit interior",
    projectSlugs: ["lounge-chair-study"],
  },
];
