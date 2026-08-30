import type { VelaSourceType } from "./contracts";

export type AdaptiveTrack = {
  id: number;
  active: boolean;
  bandwidth: number;
  language: string;
  label: string | null;
  height: number | null;
  width: number | null;
  kind?: string | null;
  hdr?: string | null;
  colorGamut?: string | null;
  codecs?: string | null;
  audioCodec?: string | null;
  videoCodec?: string | null;
  audioLanguage?: string | null;
  channelsCount?: number | null;
  spatialAudio?: boolean;
};

export type AdaptiveAudioTrack = {
  active: boolean;
  language: string;
  label: string | null;
  mimeType: string | null;
  codecs: string | null;
  primary: boolean;
  roles: string[];
  channelsCount: number | null;
  audioSamplingRate: number | null;
  spatialAudio: boolean;
  originalLanguage: string | null;
};

export type AdaptiveChapter = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
};

export type AdaptivePlayer = {
  attach: (video: HTMLMediaElement) => Promise<void>;
  load: (uri: string, startTime?: number, mimeType?: string) => Promise<void>;
  destroy: () => Promise<void>;
  configure: (config: Record<string, unknown>) => void;
  addEventListener: (type: string, listener: EventListener) => void;
  getVariantTracks: () => AdaptiveTrack[];
  selectVariantTrack: (track: AdaptiveTrack, clearBuffer?: boolean) => void;
  getAudioTracks: () => AdaptiveAudioTrack[];
  selectAudioTrack: (track: AdaptiveAudioTrack) => void;
  getTextTracks: () => AdaptiveTrack[];
  selectTextTrack: (track: AdaptiveTrack) => void;
  setTextTrackVisibility: (visible: boolean) => void | Promise<void>;
  isTextTrackVisible: () => boolean;
  addTextTrackAsync: (
    uri: string,
    language: string,
    kind?: string,
    mimeType?: string,
    codecs?: string,
    label?: string,
    forced?: boolean,
  ) => Promise<AdaptiveTrack>;
  getChaptersTracks: () => Array<{ language: string }>;
  getChaptersAsync: (language: string) => Promise<AdaptiveChapter[]>;
  isLive: () => boolean;
  seekRange: () => { start: number; end: number };
  getLiveLatency: () => number | null;
};

export type ShakaNamespace = {
  polyfill: { installAll: () => void };
  Player: {
    new (): AdaptivePlayer;
    isBrowserSupported?: () => boolean;
  };
};

export type QualityOption = { height: number; bandwidth: number; track: AdaptiveTrack };
export type TextOption = { id: string; label: string; language: string; track?: AdaptiveTrack; nativeIndex?: number };
export type AudioOption = { id: string; label: string; language: string; detail: string; track: AdaptiveAudioTrack };

export function detectSourceType(src: string, requested: VelaSourceType): Exclude<VelaSourceType, "auto"> {
  if (requested !== "auto") return requested;
  const clean = src.toLowerCase().split("?")[0];
  if (clean.endsWith(".m3u8")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  return "mp4";
}

export function sourceMime(type: Exclude<VelaSourceType, "auto">) {
  if (type === "hls") return "application/x-mpegurl";
  if (type === "dash") return "application/dash+xml";
  return "video/mp4";
}

export function audioId(track: AdaptiveAudioTrack, index: number) {
  return [
    index,
    track.language,
    track.label ?? "",
    track.roles.join("-"),
    track.channelsCount ?? 0,
    track.codecs ?? "",
  ].join(":");
}

export function audioDetail(track: AdaptiveAudioTrack) {
  const parts: string[] = [];
  if (track.channelsCount) parts.push(track.channelsCount >= 6 ? `${track.channelsCount - 1}.1` : `${track.channelsCount}ch`);
  if (track.spatialAudio) parts.push("spatial");
  if (track.roles.includes("commentary")) parts.push("commentary");
  return parts.join(" · ") || (track.primary ? "primary" : "audio");
}

export function mediaBadges(variant?: AdaptiveTrack, audio?: AdaptiveAudioTrack) {
  const badges = new Set<string>();
  const videoCodec = (variant?.videoCodec ?? variant?.codecs ?? "").toLowerCase();
  const audioCodec = (audio?.codecs ?? variant?.audioCodec ?? "").toLowerCase();
  const hdr = (variant?.hdr ?? "").toUpperCase();

  if (videoCodec.includes("dvh1") || videoCodec.includes("dvhe")) badges.add("DOLBY VISION");
  else if (hdr === "PQ" || hdr.includes("HDR10")) badges.add("HDR10");
  else if (hdr === "HLG") badges.add("HLG");

  if (audio?.spatialAudio || variant?.spatialAudio) {
    if (audioCodec.includes("ec-3") || audioCodec.includes("eac3") || audioCodec.includes("ac-4")) badges.add("DOLBY ATMOS");
    else badges.add("SPATIAL AUDIO");
  } else if (audioCodec.includes("ec-3") || audioCodec.includes("eac3") || audioCodec.includes("ac-4")) {
    badges.add("DOLBY AUDIO");
  }

  if ((variant?.colorGamut ?? "").toLowerCase().includes("2020")) badges.add("BT.2020");
  return Array.from(badges);
}
