export type SourceAssetId = 1 | 2 | 3 | 4 | 5 | 6;
export type SequenceId = 3 | 4 | 5 | 6;
export const homeSequenceIds = [3, 6, 5] as const;

export const sourceVideoIds = {
  1: "1243948791", 2: "1243948789", 3: "1243951425",
  4: "1243948790", 5: "1243948881", 6: "1243948923",
} as const satisfies Record<SourceAssetId, string>;

export interface VimeoVideo {
  readonly id: string;
  readonly watchUrl: string;
  readonly embedUrl: string;
}

export interface SequenceConfig {
  readonly frameCount: number;
  readonly poster: string;
}

export const sequenceConfigs: Record<SequenceId, SequenceConfig> = {
  3: { frameCount: 96, poster: "images/posters/3.webp" },
  4: { frameCount: 96, poster: "images/posters/4.webp" },
  5: { frameCount: 96, poster: "images/posters/5.webp" },
  6: { frameCount: 96, poster: "images/posters/6.webp" },
};

export function isSequenceId(value: number): value is SequenceId {
  return Number.isInteger(value) && Object.hasOwn(sequenceConfigs, value);
}

/** All media paths are relative, so the same files work at a domain root or a GitHub project path. */
export function assetUrl(path: string, base = "./"): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.split("/").includes("..")) throw new RangeError("Expected a local asset path");
  return (base.endsWith("/") ? base : base + "/") + path.replace(/^\/+/, "");
}

/** Frame indices follow the original 1-based filenames. */
export function getFramePath(sequenceId: number, frameIndex: number): string {
  if (!isSequenceId(sequenceId)) throw new RangeError("A continuous sequence must be 3, 4, 5 or 6");
  if (!Number.isInteger(frameIndex) || frameIndex < 1 || frameIndex > sequenceConfigs[sequenceId].frameCount) throw new RangeError("Frame index is outside the available sequence");
  return `frames/${sequenceId}/${sequenceId}.${frameIndex}.webp`;
}

export function getFramePaths(sequenceId: SequenceId, base = "./"): string[] {
  return Array.from({ length: sequenceConfigs[sequenceId].frameCount }, (_, index) => assetUrl(getFramePath(sequenceId, index + 1), base));
}

export function getVimeoVideo(sourceAssetId: number): VimeoVideo {
  if (!Number.isInteger(sourceAssetId) || !Object.hasOwn(sourceVideoIds, sourceAssetId)) throw new RangeError("A source film must be numbered 1 to 6");
  const id = sourceVideoIds[sourceAssetId as SourceAssetId];
  return { id, watchUrl: `https://vimeo.com/${id}`, embedUrl: `https://player.vimeo.com/video/${id}` };
}

export const videoManifest = Object.fromEntries(Object.keys(sourceVideoIds).map((id) => [id, getVimeoVideo(Number(id))])) as Record<SourceAssetId, VimeoVideo>;
