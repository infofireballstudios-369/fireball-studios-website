export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: BlogSection[];
  publishDate: string;
  /** Estimated reading time in minutes. */
  readTime: number;
  author: string;
  category: string;
  image: string;
  sourceAssetId?: SourceAssetId;
  video?: VimeoVideo;
}

const articleDrafts: Omit<BlogPost, "readTime">[] = [
  {
    slug: "how-to-brief-a-property-visualisation",
    title: "A better brief makes a better visualisation.",
    excerpt:
      "From floor plans to the feeling of a room: what to include in a property visualisation brief, and why each detail matters.",
    publishDate: "2026-11-03",
    author: "Fireball Studios",
    category: "Property & architecture",
    image: "/posters/1.webp",
    content: [
      {
        heading: "Start with the decision your image needs to support",
        paragraphs: [
          "A useful property visualisation brief explains who will see the images, what they need to understand and where the images will appear. A sales brochure for a new home has different priorities from an interior presentation or a conversation about a proposed extension. Define that purpose before collecting references.",
          "Describe the property in ordinary language. Is the appeal its connection to the garden, generous shared spaces or a carefully considered material palette? Choose two or three priorities. These give the visualisation team a clear basis for proposing camera positions, lighting and the balance between wider views and details.",
        ],
      },
      {
        heading: "Bring the right information together",
        paragraphs: [
          "Share the latest available plans, elevations and sections, with revision dates where possible. Include a model if one exists, along with site photographs and an indication of the surrounding context. Identify what is confirmed and what remains open to interpretation so an early visual does not quietly become an unintended specification.",
          "Material references work best when they are specific. A product reference for brick, flooring or kitchen finishes is more useful than a general mood board alone. Add a sentence explaining what you like about each inspiration image: its warmth, composition, furniture arrangement or treatment of daylight.",
        ],
        bullets: [
          "Current drawings and any available model files.",
          "Material, furniture and landscape references, with unresolved choices marked.",
          "A list of required views and the intended audience for each.",
          "Target delivery date, review contacts and final image formats.",
        ],
      },
      {
        heading: "Make reviews easy to act on",
        paragraphs: [
          "Agree who will gather feedback before production begins. Consolidated comments prevent two people from requesting conflicting changes. Review the layout and camera composition first, then materials and styling, and finally small finishing details. Annotated images with numbered comments are particularly helpful when discussing a room remotely.",
          "Separate corrections from new ideas. If the brief changes, explain the reason and identify which outputs are affected. That makes it easier to agree the next steps and understand any effect on the schedule before further work begins.",
        ],
      },
      {
        heading: "Brief for the final destination",
        paragraphs: [
          "A website banner, property portal image and printed brochure each need a different composition or crop. Share the intended dimensions early, including any space required for headlines. Request a consistent set of approved images and keep a record of the finish choices they show. A clear handover helps the visualisation remain useful across the whole presentation.",
        ],
      },
    ],
  },
  {
    slug: "stills-animation-or-interactive-tour",
    title: "Stills, film or an interactive tour?",
    excerpt:
      "Choose a visualisation format around the story you need to tell, the way your audience explores and the places it will be seen.",
    publishDate: "2026-11-03",
    author: "Fireball Studios",
    category: "Visual storytelling",
    image: "/posters/2.webp",
    content: [
      {
        heading: "Choose a job for the visualisation",
        paragraphs: [
          "Stills, animation and interactive experiences answer different questions. A still can communicate one carefully composed idea. A film can guide someone through a sequence. An interactive tour gives the viewer control over what to explore. Begin with the information your audience needs, then choose the format that makes it easiest to understand.",
          "Consider the viewing context too. Someone scrolling through a property listing may only pause briefly, while a visitor at a showroom may be ready to explore. A strong proposal can combine formats, but each output should earn its place rather than repeat the same information.",
        ],
      },
      {
        heading: "Use stills to establish a clear impression",
        paragraphs: [
          "Still imagery suits brochures, product listings, presentations and website sections where a single view needs to work immediately. Composition and lighting can direct attention to a room's proportions, a material finish or a product silhouette. A small, deliberate set of views is often more useful than many similar angles.",
          "Plan the crops alongside the full image. A wide interior view may need a second composition for a portrait social post. Leaving room for text and checking small-screen legibility at the briefing stage helps avoid awkward crops later.",
        ],
      },
      {
        heading: "Use film to reveal connections",
        paragraphs: [
          "Animation is useful when movement adds understanding: approaching an entrance, moving from a living space to a terrace or revealing a product from several angles. A simple storyboard gives each shot a purpose. Think about the opening image, the change each shot reveals and the final impression.",
          "Keep the pace suited to the subject. A considered interior walkthrough needs enough time to read the space. Agree the duration, aspect ratios and whether the story must work without sound. Any essential information should remain available as readable text alongside the film.",
        ],
      },
      {
        heading: "Use interaction when choice matters",
        paragraphs: [
          "An interactive experience helps people inspect viewpoints or compare options at their own pace. Specify the actual choices: moving between rooms, selecting finishes or rotating an object. A 360-degree panorama and a freely navigable scene offer different kinds of control, so describe the expected behaviour clearly.",
          "Check the experience on the devices your audience will use. Loading time, touch controls and a clear route back all shape how useful it feels. Provide a still-image alternative and readable information so the core story remains available when someone cannot, or prefers not to, use the interactive view.",
        ],
      },
    ],
  },
  {
    slug: "furniture-visualisation-material-references",
    title: "Making furniture feel at home in CGI.",
    excerpt:
      "How thoughtful material references, lighting and context help a furniture visualisation communicate the character of a product.",
    publishDate: "2026-11-03",
    author: "Fireball Studios",
    category: "Furniture & products",
    image: "/posters/product-detail.webp",
    content: [
      {
        heading: "Define the character of the product",
        paragraphs: [
          "A furniture visualisation needs to explain more than a silhouette. It can communicate the softness of upholstery, the direction of a timber grain and the way a chair sits within a room. Begin by deciding which qualities matter most and which details distinguish this particular product from a similar one.",
          "Choose the role of the setting early. A clean studio image makes shapes and finish options easy to compare. A lifestyle scene introduces scale, atmosphere and a sense of use. Both can be valuable, provided the surroundings support the product and do not compete for attention.",
        ],
      },
      {
        heading: "Make material references specific",
        paragraphs: [
          "Send close photographs as well as wider views. For timber, show grain direction, edge treatment and the relationship between adjacent surfaces. For upholstery, include seams, piping and the size of the weave. For metal or lacquer, show how the surface responds to both direct and softer light.",
          "A colour name alone leaves plenty of room for interpretation. Add supplier references and photographs taken in neutral lighting where available. Explain whether a finish is matte, satin or gloss, and identify any variations that are intentional. If samples differ, nominate the reference that should guide the visualisation.",
        ],
        bullets: [
          "Overall dimensions and clear photographs from several angles.",
          "Close references for grain, weave, stitching and surface texture.",
          "Approved finish variants and the names used in your catalogue.",
          "Details that must stay consistent across the whole image set.",
        ],
      },
      {
        heading: "Let the light explain the form",
        paragraphs: [
          "Lighting changes how a material reads. A broad light source can reveal gentle curves, while a controlled highlight can describe an edge or a polished surface. References should therefore show the intended atmosphere as well as the product itself. Identify whether the goal is a neutral catalogue view or a more expressive campaign image.",
          "Review several finishes under a consistent setup before approving the full series. This makes comparison easier and helps reveal whether a dark fabric loses its texture or a reflective surface distracts from the shape. Check the product at both full size and the smaller scale used on a listing page.",
        ],
      },
      {
        heading: "Plan a useful image family",
        paragraphs: [
          "List the required views before styling the scene: a main image, side or rear view, material detail and contextual composition. Agree background treatments, crops and naming conventions. A coherent image family helps a customer move from an overall impression to the details that matter, while giving your team assets that work across a catalogue, website and launch campaign.",
        ],
      },
    ],
  },
  {
    slug: "spaceship-concept-visualisation",
    title: "From imagination to image: a spaceship concept.",
    excerpt:
      "Inside a studio concept exploring spaceships, a cinematic hangar and the role of composition, light and scale in bringing an imagined scene to life.",
    publishDate: "2026-11-05",
    author: "Fireball Studios",
    category: "Studio concepts",
    image: "/posters/6.webp",
    sourceAssetId: 6,
    video: getVimeoVideo(6),
    content: [
      {
        heading: "An imagined scene with a clear focal point",
        paragraphs: [
          "This spaceship concept is a Fireball Studios visualisation study: an opportunity to explore an imagined hangar through composition, atmosphere and a cinematic camera view. The setting creates a world around the spacecraft, with a central aisle leading towards the open bay and the distant planetary horizon.",
          "A scene like this can contain a great deal of detail, but it still needs a clear visual hierarchy. The viewer should be able to recognise the main subject before exploring the surroundings. A strong central composition gives the eye somewhere to begin and a direction to follow.",
        ],
      },
      {
        heading: "Give the world a sense of scale",
        paragraphs: [
          "Scale is communicated through relationships. Smaller figures, repeated structures and the height of the hangar opening help the viewer read the size of the space. Repetition also creates depth: forms become smaller as they recede, drawing attention through the foreground towards the spacecraft beyond.",
          "When developing an imagined environment, it helps to establish those relationships before adding surface detail. Review a simple view of the scene and ask whether the focal point remains clear. If the space feels confusing without its textures, further decoration is unlikely to resolve the composition.",
        ],
        bullets: [
          "Choose a primary subject and a viewpoint that gives it room.",
          "Use repeated forms and familiar proportions to communicate scale.",
          "Leave quieter areas around the most important visual details.",
        ],
      },
      {
        heading: "Use light to organise the scene",
        paragraphs: [
          "The cool palette and bright outlines of the hangar opening give this study its atmosphere. Light also performs a practical visual role: it separates silhouettes, reveals surfaces and draws attention towards the bay. Darker areas provide contrast and prevent every part of the image from competing equally.",
          "For a concept visualisation, lighting references are most useful when their purpose is explained. Consider whether a reference contributes colour, contrast, depth or a particular mood. Combining those observations gives the scene a consistent direction without requiring every surface to receive the same treatment.",
        ],
      },
      {
        heading: "Let the film reveal the space",
        paragraphs: [
          "A moving camera adds another layer to an environment study. The opening view establishes the setting, while changes in viewpoint reveal relationships between objects. Watch the accompanying film as a creative exploration of that space. The same attention to framing, light and sequence can help make many kinds of imagined scenes easier to understand and more compelling to explore.",
        ],
      },
    ],
  },
];

function calculateReadTime(content: BlogSection[]): number {
  const text = content
    .flatMap(({ heading, paragraphs, bullets = [] }) => [
      heading,
      ...paragraphs,
      ...bullets,
    ])
    .join(" ");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / 200));
}

export const blogPosts: BlogPost[] = articleDrafts.map((post) => ({
  ...post,
  readTime: calculateReadTime(post.content),
}));

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
import { getVimeoVideo, type SourceAssetId, type VimeoVideo } from "./assetManifest";
