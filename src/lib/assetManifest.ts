export type SourceAssetId = 1 | 2 | 3 | 4 | 5 | 6;
export type SequenceId = SourceAssetId;

export interface VimeoVideo {
  readonly id: string;
  readonly watchUrl: string;
  readonly embedUrl: string;
}

export interface SequenceConfig {
  /** Total number of WebP frames currently available for this sequence. */
  readonly frameCount: number;
}

/** Update these counts as new WebP frames are added to public/frames. */
export const sequenceConfigs: Record<SequenceId, SequenceConfig> = {
  1: { frameCount: 6 },
  2: { frameCount: 5 },
  3: { frameCount: 96 },
  4: { frameCount: 96 },
  5: { frameCount: 96 },
  6: { frameCount: 96 },
};

export const homeSequenceIds = [3, 6, 5] as const;
export type HomeSequenceId = (typeof homeSequenceIds)[number];

function vimeoVideo(id: string): VimeoVideo {
  return { id, watchUrl: "https://vimeo.com/" + id, embedUrl: "https://player.vimeo.com/video/" + id };
}

/** Hosted films remain separate from the local WebP scroll sequences. */
export const videoManifest: Record<SourceAssetId, VimeoVideo> = {
  1: vimeoVideo("1243948791"),
  2: vimeoVideo("1243948789"),
  3: vimeoVideo("1243951425"),
  4: vimeoVideo("1243948790"),
  5: vimeoVideo("1243948881"),
  6: vimeoVideo("1243948923"),
};

/** Frame indices are 1-based, matching filenames such as 1.1.webp. */
export function getFramePath(sequenceId: number, frameIndex: number): string {
  if (!Number.isInteger(sequenceId) || sequenceId < 1) {
    throw new RangeError("sequenceId must be a positive integer");
  }
  if (!Number.isInteger(frameIndex) || frameIndex < 1) {
    throw new RangeError("frameIndex must be a positive integer");
  }
  return `/frames/${sequenceId}/${sequenceId}.${frameIndex}.webp`;
}

export function getVimeoVideo(sourceAssetId: number): VimeoVideo {
  if (!Number.isInteger(sourceAssetId) || sourceAssetId < 1 || sourceAssetId > 6) {
    throw new RangeError("sourceAssetId must be an integer from 1 to 6");
  }
  return videoManifest[sourceAssetId as SourceAssetId];
}

/** Compatibility helper for film links; this is a watch page, not a media source. */
export function getVideoPath(sequenceId: number): string {
  return getVimeoVideo(sequenceId).watchUrl;
}

export function getFramePaths(sequenceId: number, frameCount: number): string[] {
  if (!Number.isInteger(frameCount) || frameCount < 0) {
    throw new RangeError("frameCount must be a non-negative integer");
  }
  return Array.from({ length: frameCount }, (_, index) => getFramePath(sequenceId, index + 1));
}
