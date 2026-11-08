import { homeSequenceIds, type HomeSequenceId } from "./assetManifest";

export interface StoryChapter {
  sequenceId: HomeSequenceId;
  eyebrow: string;
  title: string;
  description: string;
  features?: string[];
}

const chapterCopy: Record<HomeSequenceId, Omit<StoryChapter, "sequenceId">> = {
  3: { eyebrow: "Imagine the experience", title: "Photorealistic 3D Visualisation That Brings Your Ideas to Life", description: "Fireball Studios creates imagery, animation and interactive experiences for property, automotive, furniture and products. Your vision, made visible." },
  6: { eyebrow: "Beyond the everyday", title: "Give imagination a world of its own.", description: "Our original spaceship concept explores light, atmosphere and scale. A studio study in bringing an imagined world into view.", features: ["Creative concepts", "Cinematic environments", "Visual storytelling"] },
  5: { eyebrow: "Every detail, explored", title: "A closer connection to your product.", description: "Show the finish. Explore the options. Turn furniture, vehicles and product ideas into visual experiences that invite a closer look.", features: ["Product visualisation", "Material options", "Interactive presentations"] },
};

/** The media manifest owns chapter order; copy is keyed by the source asset. */
export const homeChapters: readonly StoryChapter[] = homeSequenceIds.map((sequenceId) => ({ sequenceId, ...chapterCopy[sequenceId] }));
