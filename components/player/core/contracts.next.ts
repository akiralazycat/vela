export type VelaSourceType = "auto" | "hls" | "dash" | "mp4";

export type PlayerLoadStatus = "idle" | "loading" | "ready" | "error";

export type VelaTextTrack = {
  src: string;
  language: string;
  label: string;
  kind?: "subtitles" | "captions";
  mimeType?: string;
  default?: boolean;
};

export type VelaChapter = {
  id?: string;
  title: string;
  start: number;
  end?: number;
};

export type VelaCaptionStyle = {
  fontScale: number;
  color: string;
  background: string;
  backgroundOpacity: number;
  edge: "none" | "shadow" | "outline";
  fontFamily: "sans" | "serif" | "mono";
};

export type VelaTheme = {
  accent: string;
  surface: string;
  foreground: string;
  muted: string;
  radius: number;
  blur: number;
  controlsOpacity: number;
};

export type VelaPlayerState = {
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  quality: "auto" | number;
  textTrack: "off" | string;
  audioTrack: string | null;
  sourceType: Exclude<VelaSourceType, "auto">;
  isLive: boolean;
  atLiveEdge: boolean;
  liveLatencyMs: number | null;
  chapter: string | null;
  mediaBadges: string[];
};

export type VelaPlayerHandle = {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setQuality: (quality: "auto" | number) => void;
  setTextTrack: (track: "off" | string) => void;
  setAudioTrack: (track: string) => void;
  setCaptionStyle: (style: Partial<VelaCaptionStyle>) => void;
  goLive: () => void;
  nextChapter: () => void;
  previousChapter: () => void;
  getState: () => VelaPlayerState;
};

export type VelaPlayerProps = {
  src: string;
  sourceType?: VelaSourceType;
  poster?: string;
  title?: string;
  eyebrow?: string;
  accent?: string;
  captionsSrc?: string;
  textTracks?: VelaTextTrack[];
  thumbnailVtt?: string;
  chapters?: VelaChapter[];
  chapterLanguage?: string;
  captionStyle?: Partial<VelaCaptionStyle>;
  theme?: Partial<VelaTheme>;
  autoPlay?: boolean;
  gestures?: boolean;
  onReady?: () => void;
  onStateChange?: (state: VelaPlayerState) => void;
};
