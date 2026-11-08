import type { BudgetSequenceConfig } from "./assetManifest";
import { createFrameStore } from "./frameStore";

export type AtlasFrame = {
  source: CanvasImageSource;
  width: number;
  height: number;
  crop: { x: number; y: number; width: number; height: number };
};

/** Decode at most two image sheets; each requested frame is a crop of its sheet. */
export function createAtlasStore(config: BudgetSequenceConfig, signal: AbortSignal) {
  const store = createFrameStore([...config.atlasPaths], signal, 2);
  const framesPerAtlas = config.columns * config.rows;
  const valid = (index: number) => Number.isInteger(index) && index >= 0 && index < config.frameCount;
  const frameView = (source: CanvasImageSource, index: number): AtlasFrame => {
    const tile = index % framesPerAtlas;
    return {
      source, width: config.frameWidth, height: config.frameHeight,
      crop: {
        x: tile % config.columns * config.frameWidth,
        y: Math.floor(tile / config.columns) * config.frameHeight,
        width: config.frameWidth, height: config.frameHeight,
      },
    };
  };

  return {
    async get(index: number, priority = false): Promise<AtlasFrame | null> {
      if (!valid(index)) return null;
      const atlas = await store.get(Math.floor(index / framesPerAtlas), priority);
      return atlas ? frameView(atlas.source, index) : null;
    },
    nearest(index: number) {
      if (!valid(index)) return null;
      // Compare sheet centres so a missing sheet falls back to the closest visible frame.
      const available = store.nearest((index - (framesPerAtlas - 1) / 2) / framesPerAtlas);
      if (!available) return null;
      const first = available.index * framesPerAtlas;
      const last = Math.min(config.frameCount - 1, first + framesPerAtlas - 1);
      const nearestIndex = Math.max(first, Math.min(last, index));
      return { frame: frameView(available.frame.source, nearestIndex), index: nearestIndex };
    },
    dispose: store.dispose,
  };
}
