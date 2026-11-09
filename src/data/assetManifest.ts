export type SourceAssetId = 1 | 2 | 3 | 4 | 5 | 6;
export type SequenceId = 3 | 4 | 5 | 6;
export type FrameQuality = 1280 | 1920 | 2560 | 3840;
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
  readonly qualities: readonly FrameQuality[];
}

export const sequenceConfigs: Record<SequenceId, SequenceConfig> = {
  3: { frameCount: 96, poster: "images/posters/3.webp", qualities: [1280, 1920, 2560, 3840] },
  4: { frameCount: 96, poster: "images/posters/4.webp", qualities: [1280] },
  5: { frameCount: 96, poster: "images/posters/5.webp", qualities: [1280, 1920] },
  6: { frameCount: 96, poster: "images/posters/6.webp", qualities: [1280, 1920, 2560, 3840] },
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
export function getFramePath(sequenceId: number, frameIndex: number, quality: FrameQuality = 1280): string {
  if (!isSequenceId(sequenceId)) throw new RangeError("A continuous sequence must be 3, 4, 5 or 6");
  if (!Number.isInteger(frameIndex) || frameIndex < 1 || frameIndex > sequenceConfigs[sequenceId].frameCount) throw new RangeError("Frame index is outside the available sequence");
  if (!sequenceConfigs[sequenceId].qualities.includes(quality)) throw new RangeError("This resolution is unavailable for the source sequence");
  return `frames/${quality === 1280 ? sequenceId : `quality/${sequenceId}/${quality}`}/${sequenceId}.${frameIndex}.webp`;
}

export function getFramePaths(sequenceId: SequenceId, base = "./", quality: FrameQuality = 1280): string[] {
  return Array.from({ length: sequenceConfigs[sequenceId].frameCount }, (_, index) => assetUrl(getFramePath(sequenceId, index + 1, quality), base));
}

/** Match genuine source detail to the screen; avoid sending desktop frames to narrow or constrained connections. */
export function selectSequenceQuality(sequenceId: SequenceId, screen: { viewportWidth: number; pixelRatio?: number; saveData?: boolean; effectiveType?: string }): FrameQuality {
  const width = Number.isFinite(screen.viewportWidth) ? Math.max(0, screen.viewportWidth) : 0;
  const ratio = Number.isFinite(screen.pixelRatio) ? Math.max(1, Math.min(screen.pixelRatio ?? 1, 1.5)) : 1;
  if (sequenceId === 4 || width <= 900 || screen.saveData || /^(slow-)?2g$/.test(screen.effectiveType ?? "")) return 1280;
  if (sequenceId === 5) return 1920;
  if (width >= 2400 && width * ratio >= 3200) return 3840;
  if (width >= 1800 && ratio > 1) return 2560;
  return 1920;
}

export function getFrameDimensions(sequenceId: SequenceId, quality: FrameQuality) {
  if (!sequenceConfigs[sequenceId].qualities.includes(quality)) throw new RangeError("This resolution is unavailable for the source sequence");
  return { width: quality, height: sequenceId === 5 ? (quality === 1280 ? 666 : 1000) : quality * 9 / 16 };
}

/** Clean stills stay at their genuine resolution; the browser selects one shared poster URL. */
export function getSequencePoster(sequenceId: SequenceId, base = "./") {
  if (sequenceId === 4) {
    const src = assetUrl(sequenceConfigs[4].poster, base);
    return { src, srcset: `${src} 1440w`, sizes: "100vw", width: 1440, height: 810 };
  }
  const widths = sequenceId === 6 ? [1280, 1920, 2560, 3840] : [1280, 1920];
  const path = (width: number) => assetUrl(`images/posters/quality/${sequenceId}/${sequenceId}-${width}.webp`, base);
  const width = widths.at(-1)!;
  return { src: path(1280), srcset: widths.map((width) => `${path(width)} ${width}w`).join(", "), sizes: "100vw", width, height: width * 9 / 16 };
}

export function getVimeoVideo(sourceAssetId: number): VimeoVideo {
  if (!Number.isInteger(sourceAssetId) || !Object.hasOwn(sourceVideoIds, sourceAssetId)) throw new RangeError("A source film must be numbered 1 to 6");
  const id = sourceVideoIds[sourceAssetId as SourceAssetId];
  return { id, watchUrl: `https://vimeo.com/${id}`, embedUrl: `https://player.vimeo.com/video/${id}` };
}

export const videoManifest = Object.fromEntries(Object.keys(sourceVideoIds).map((id) => [id, getVimeoVideo(Number(id))])) as Record<SourceAssetId, VimeoVideo>;
