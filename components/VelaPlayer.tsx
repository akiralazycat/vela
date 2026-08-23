"use client";

import {
  forwardRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { findThumbnailCue, loadThumbnailVtt, type ThumbnailCue } from "../lib/thumbnail-vtt";

export type VelaSourceType = "auto" | "hls" | "dash" | "mp4";

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

type IconName =
  | "play"
  | "pause"
  | "volume"
  | "muted"
  | "captions"
  | "loop"
  | "pip"
  | "fullscreen"
  | "settings";

type AdaptiveTrack = {
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

type AdaptiveAudioTrack = {
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

type AdaptiveChapter = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
};

type AdaptivePlayer = {
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
  selectTextTrack: (track: AdaptiveTrack | null) => void;
  addTextTrackAsync: (
    uri: string,
    language: string,
    kind?: string,
    mimeType?: string,
    codecs?: string,
  ) => Promise<unknown>;
  getChaptersTracks: () => Array<{ language: string }>;
  getChaptersAsync: (language: string) => Promise<AdaptiveChapter[]>;
  isLive: () => boolean;
  seekRange: () => { start: number; end: number };
  getLiveLatency: () => number | null;
};

type ShakaNamespace = {
  polyfill: { installAll: () => void };
  Player: {
    new (): AdaptivePlayer;
    isBrowserSupported?: () => boolean;
  };
};

type QualityOption = { height: number; bandwidth: number; track: AdaptiveTrack };
type TextOption = { id: string; label: string; language: string; track?: AdaptiveTrack; nativeIndex?: number };
type AudioOption = { id: string; label: string; language: string; detail: string; track: AdaptiveAudioTrack };

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
const EMPTY_TEXT_TRACKS: VelaTextTrack[] = [];
const EMPTY_CHAPTERS: VelaChapter[] = [];

const defaultTheme: VelaTheme = {
  accent: "#d8ff62",
  surface: "#080908",
  foreground: "#ffffff",
  muted: "#a5a79f",
  radius: 0,
  blur: 18,
  controlsOpacity: 0.76,
};

const defaultCaptionStyle: VelaCaptionStyle = {
  fontScale: 1,
  color: "#ffffff",
  background: "#080908",
  backgroundOpacity: 0.82,
  edge: "shadow",
  fontFamily: "sans",
};

function detectSourceType(src: string, requested: VelaSourceType): Exclude<VelaSourceType, "auto"> {
  if (requested !== "auto") return requested;
  const clean = src.toLowerCase().split("?")[0];
  if (clean.endsWith(".m3u8")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  return "mp4";
}

function sourceMime(type: Exclude<VelaSourceType, "auto">) {
  if (type === "hls") return "application/x-mpegurl";
  if (type === "dash") return "application/dash+xml";
  return "video/mp4";
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(8, 9, 8, ${alpha})`;
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function audioId(track: AdaptiveAudioTrack, index: number) {
  return [
    index,
    track.language,
    track.label ?? "",
    track.roles.join("-"),
    track.channelsCount ?? 0,
    track.codecs ?? "",
  ].join(":");
}

function audioDetail(track: AdaptiveAudioTrack) {
  const parts: string[] = [];
  if (track.channelsCount) parts.push(track.channelsCount >= 6 ? `${track.channelsCount - 1}.1` : `${track.channelsCount}ch`);
  if (track.spatialAudio) parts.push("spatial");
  if (track.roles.includes("commentary")) parts.push("commentary");
  return parts.join(" · ") || (track.primary ? "primary" : "audio");
}

function mediaBadges(variant?: AdaptiveTrack, audio?: AdaptiveAudioTrack) {
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

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "play") return <svg {...common} fill="currentColor" stroke="none"><path d="M8 5.7a1 1 0 0 1 1.52-.85l9.1 5.95a1.43 1.43 0 0 1 0 2.4l-9.1 5.95A1 1 0 0 1 8 18.3V5.7Z" /></svg>;
  if (name === "pause") return <svg {...common} fill="currentColor" stroke="none"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>;
  if (name === "volume") return <svg {...common}><path d="M5 10v4h3l4 3V7L8 10H5Z" /><path d="M15 9.3a4 4 0 0 1 0 5.4" /><path d="M17.5 7a7 7 0 0 1 0 10" /></svg>;
  if (name === "muted") return <svg {...common}><path d="M5 10v4h3l4 3V7L8 10H5Z" /><path d="m16 10 4 4" /><path d="m20 10-4 4" /></svg>;
  if (name === "captions") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 10.2a2.2 2.2 0 1 0 0 3.6" /><path d="M17 10.2a2.2 2.2 0 1 0 0 3.6" /></svg>;
  if (name === "loop") return <svg {...common}><path d="M17 2.8 20.2 6 17 9.2" /><path d="M3.8 10V8a2 2 0 0 1 2-2h14" /><path d="M7 21.2 3.8 18 7 14.8" /><path d="M20.2 14v2a2 2 0 0 1-2 2h-14" /></svg>;
  if (name === "pip") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" /></svg>;
  if (name === "fullscreen") return <svg {...common}><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M16 21h5v-5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.91 2.91-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21h-4v-.08A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.91-2.91.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3v-4h.08A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.91-2.91.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.08V3h4v.08A1.65 1.65 0 0 0 15.4 4a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.91 2.91-.06.06A1.65 1.65 0 0 0 19.4 9c.37.22.7.55.92.92.22.38.36.8.4 1.24H21v4h-.08A1.65 1.65 0 0 0 19.4 15Z" /></svg>;
}

export const VelaPlayer = forwardRef<VelaPlayerHandle, VelaPlayerProps>(function VelaPlayer(
  {
    src,
    sourceType = "auto",
    poster,
    title = "Untitled",
    eyebrow = "VELA",
    accent,
    captionsSrc,
    textTracks = EMPTY_TEXT_TRACKS,
    thumbnailVtt,
    chapters = EMPTY_CHAPTERS,
    chapterLanguage = "en",
    captionStyle,
    theme,
    autoPlay = false,
    gestures = true,
    onReady,
    onStateChange,
  },
  ref,
) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shakaRef = useRef<AdaptivePlayer | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadyRef = useRef(onReady);
  const gestureRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const lastTapRef = useRef<{ zone: "left" | "center" | "right"; at: number } | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const resolvedType = useMemo(() => detectSourceType(src, sourceType), [src, sourceType]);
  const adaptive = resolvedType === "hls" || resolvedType === "dash";
  const mergedTheme = useMemo(
    () => ({ ...defaultTheme, ...theme, accent: accent ?? theme?.accent ?? defaultTheme.accent }),
    [accent, theme],
  );
  const [captionStyleState, setCaptionStyleState] = useState<VelaCaptionStyle>({ ...defaultCaptionStyle, ...captionStyle });

  useEffect(() => {
    setCaptionStyleState((current) => ({ ...current, ...captionStyle }));
  }, [captionStyle]);

  const normalizedTracks = useMemo<VelaTextTrack[]>(() => {
    if (!captionsSrc) return textTracks;
    if (textTracks.some((track) => track.src === captionsSrc)) return textTracks;
    return [{ src: captionsSrc, language: "en", label: "English", kind: "subtitles" }, ...textTracks];
  }, [captionsSrc, textTracks]);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(0.82);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [preview, setPreview] = useState<{ x: number; time: number } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loop, setLoop] = useState(false);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<"auto" | number>("auto");
  const [textOptions, setTextOptions] = useState<TextOption[]>([]);
  const [selectedText, setSelectedText] = useState<"off" | string>("off");
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
  const [spriteSize, setSpriteSize] = useState<{ width: number; height: number } | null>(null);
  const [resolvedChapters, setResolvedChapters] = useState<VelaChapter[]>(chapters);
  const [isLive, setIsLive] = useState(false);
  const [seekWindow, setSeekWindow] = useState({ start: 0, end: 0 });
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  const timelineStart = isLive ? seekWindow.start : 0;
  const timelineEnd = isLive ? seekWindow.end : duration;
  const timelineSpan = Math.max(timelineEnd - timelineStart, 0);
  const progress = timelineSpan ? clamp(((currentTime - timelineStart) / timelineSpan) * 100, 0, 100) : 0;
  const bufferedProgress = timelineSpan ? clamp(((buffered - timelineStart) / timelineSpan) * 100, 0, 100) : 0;
  const atLiveEdge = isLive ? seekWindow.end - currentTime <= 2.5 : false;

  const currentChapter = useMemo(() => {
    return resolvedChapters.find((chapter, index) => {
      const end = chapter.end ?? resolvedChapters[index + 1]?.start ?? timelineEnd;
      return currentTime >= chapter.start && currentTime < end;
    }) ?? null;
  }, [currentTime, resolvedChapters, timelineEnd]);

  const captionEdge = captionStyleState.edge === "outline"
    ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
    : captionStyleState.edge === "shadow"
      ? "0 2px 5px rgba(0,0,0,.95)"
      : "none";

  const captionFont = captionStyleState.fontFamily === "serif"
    ? 'Georgia, "Times New Roman", serif'
    : captionStyleState.fontFamily === "mono"
      ? '"SFMono-Regular", Consolas, monospace'
      : "Arial, Helvetica, sans-serif";

  const style = useMemo(() => ({
    "--vela-accent": mergedTheme.accent,
    "--vela-surface": mergedTheme.surface,
    "--vela-foreground": mergedTheme.foreground,
    "--vela-muted": mergedTheme.muted,
    "--vela-radius": `${mergedTheme.radius}px`,
    "--vela-blur": `${mergedTheme.blur}px`,
    "--vela-controls-opacity": mergedTheme.controlsOpacity,
    "--vela-caption-scale": captionStyleState.fontScale,
    "--vela-caption-color": captionStyleState.color,
    "--vela-caption-bg": hexToRgba(captionStyleState.background, captionStyleState.backgroundOpacity),
    "--vela-caption-edge": captionEdge,
    "--vela-caption-font": captionFont,
  }) as CSSProperties, [captionEdge, captionFont, captionStyleState, mergedTheme]);

  const getState = useCallback((): VelaPlayerState => ({
    currentTime,
    duration: isLive ? timelineSpan : duration,
    paused: !playing,
    volume,
    muted,
    quality: selectedQuality,
    textTrack: selectedText,
    audioTrack: selectedAudio,
    sourceType: resolvedType,
    isLive,
    atLiveEdge,
    liveLatencyMs,
    chapter: currentChapter?.id ?? currentChapter?.title ?? null,
    mediaBadges: badges,
  }), [
    atLiveEdge,
    badges,
    currentChapter,
    currentTime,
    duration,
    isLive,
    liveLatencyMs,
    muted,
    playing,
    resolvedType,
    selectedAudio,
    selectedQuality,
    selectedText,
    timelineSpan,
    volume,
  ]);

  useEffect(() => {
    onStateChange?.(getState());
  }, [getState, onStateChange]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const scheduleControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    if (playing && !settingsOpen) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2200);
    }
  }, [clearHideTimer, playing, settingsOpen]);

  useEffect(() => {
    scheduleControls();
    return clearHideTimer;
  }, [scheduleControls, clearHideTimer]);

  const flashGesture = useCallback((message: string) => {
    if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    setGestureHint(message);
    gestureHintTimerRef.current = setTimeout(() => setGestureHint(null), 700);
  }, []);

  const refreshAdaptiveTracks = useCallback((player: AdaptivePlayer) => {
    const variants = player.getVariantTracks();
    const activeVariant = variants.find((track) => track.active);
    const activeLanguage = activeVariant?.audioLanguage ?? activeVariant?.language;

    const byHeight = new Map<number, AdaptiveTrack>();
    for (const track of variants) {
      const language = track.audioLanguage ?? track.language;
      if (!track.height || (activeLanguage && language !== activeLanguage)) continue;
      const previous = byHeight.get(track.height);
      if (!previous || track.bandwidth > previous.bandwidth) byHeight.set(track.height, track);
    }

    setQualities(
      Array.from(byHeight.entries())
        .map(([height, track]) => ({ height, bandwidth: track.bandwidth, track }))
        .sort((a, b) => b.height - a.height),
    );

    setTextOptions(player.getTextTracks().map((track) => ({
      id: String(track.id),
      label: track.label || track.language || `Track ${track.id}`,
      language: track.language,
      track,
    })));

    const audioTracks = player.getAudioTracks();
    const audio = audioTracks.map((track, index) => ({
      id: audioId(track, index),
      label: track.label || track.language.toUpperCase() || `Audio ${index + 1}`,
      language: track.language,
      detail: audioDetail(track),
      track,
    }));
    setAudioOptions(audio);
    setSelectedAudio(audio.find((option) => option.track.active)?.id ?? audio[0]?.id ?? null);

    const activeAudio = audioTracks.find((track) => track.active) ?? audioTracks[0];
    setBadges(mediaBadges(activeVariant, activeAudio));
  }, []);

  const refreshLiveInfo = useCallback(() => {
    const player = shakaRef.current;
    if (!player || !player.isLive()) return;
    const range = player.seekRange();
    setSeekWindow(range);
    setLiveLatencyMs(player.getLiveLatency());
  }, []);

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    const media = currentVideo;
    let disposed = false;
    let instance: AdaptivePlayer | null = null;
    const listeners: Array<[string, EventListener]> = [];

    setStatus("loading");
    setErrorMessage(null);
    setSelectedQuality("auto");
    setSelectedText("off");
    setSelectedAudio(null);
    setQualities([]);
    setTextOptions([]);
    setAudioOptions([]);
    setBadges([]);
    setStarted(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLive(false);
    setSeekWindow({ start: 0, end: 0 });
    setLiveLatencyMs(null);
    setResolvedChapters(chapters);

    const listen = (type: string, listener: EventListener) => {
      instance?.addEventListener(type, listener);
      listeners.push([type, listener]);
    };

    const onEngineError: EventListener = () => {
      if (!disposed) {
        setStatus("error");
        setErrorMessage("The adaptive stream could not be loaded.");
      }
    };

    async function load() {
      try {
        if (adaptive) {
          media.removeAttribute("src");
          media.load();

          const module = await import("shaka-player");
          const candidate = module as unknown as { default?: ShakaNamespace };
          const shaka = candidate.default ?? (module as unknown as ShakaNamespace);
          shaka.polyfill.installAll();

          if (shaka.Player.isBrowserSupported && !shaka.Player.isBrowserSupported()) {
            throw new Error("Adaptive playback is not supported in this browser.");
          }

          instance = new shaka.Player();
          shakaRef.current = instance;
          listen("error", onEngineError);
          listen("trackschanged", () => {
            if (instance && !disposed) refreshAdaptiveTracks(instance);
          });
          listen("variantchanged", () => {
            if (instance && !disposed) refreshAdaptiveTracks(instance);
          });
          listen("audiotrackchanged", () => {
            if (instance && !disposed) refreshAdaptiveTracks(instance);
          });
          listen("manifestupdated", () => {
            if (!disposed) refreshLiveInfo();
          });

          instance.configure({ abr: { enabled: true } });
          await instance.attach(media);
          await instance.load(src, undefined, sourceMime(resolvedType));

          for (const track of normalizedTracks) {
            await instance.addTextTrackAsync(
              track.src,
              track.language,
              track.kind ?? "subtitles",
              track.mimeType ?? "text/vtt",
            );
          }

          if (disposed) return;
          refreshAdaptiveTracks(instance);

          const live = instance.isLive();
          setIsLive(live);
          if (live) {
            const range = instance.seekRange();
            setSeekWindow(range);
            setLiveLatencyMs(instance.getLiveLatency());
          }

          if (!chapters.length) {
            const tracks = instance.getChaptersTracks();
            const language = tracks.find((track) => track.language === chapterLanguage)?.language
              ?? tracks[0]?.language;
            if (language) {
              const manifestChapters = await instance.getChaptersAsync(language);
              if (!disposed) {
                setResolvedChapters(manifestChapters.map((chapter) => ({
                  id: chapter.id,
                  title: chapter.title,
                  start: chapter.startTime,
                  end: chapter.endTime,
                })));
              }
            }
          }
        } else {
          shakaRef.current = null;
          media.src = src;
          media.load();
          setTextOptions(normalizedTracks.map((track, nativeIndex) => ({
            id: `native-${nativeIndex}`,
            label: track.label,
            language: track.language,
            nativeIndex,
          })));
        }

        if (disposed) return;
        setStatus("ready");
        onReadyRef.current?.();

        if (autoPlay) {
          setStarted(true);
          await media.play();
        }
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Vela could not load this source.");
      }
    }

    void load();

    return () => {
      disposed = true;
      shakaRef.current = null;
      if (instance) void instance.destroy();
      media.pause();
      media.removeAttribute("src");
      media.load();
      void listeners;
    };
  }, [
    adaptive,
    autoPlay,
    chapterLanguage,
    chapters,
    normalizedTracks,
    refreshAdaptiveTracks,
    refreshLiveInfo,
    resolvedType,
    src,
  ]);

  useEffect(() => {
    if (!thumbnailVtt) {
      setThumbnailCues([]);
      setSpriteSize(null);
      return;
    }

    const controller = new AbortController();
    loadThumbnailVtt(thumbnailVtt, controller.signal)
      .then(setThumbnailCues)
      .catch(() => setThumbnailCues([]));
    return () => controller.abort();
  }, [thumbnailVtt]);

  useEffect(() => {
    const first = thumbnailCues[0];
    if (!first || typeof window === "undefined") {
      setSpriteSize(null);
      return;
    }

    const image = new Image();
    image.onload = () => setSpriteSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setSpriteSize(null);
    image.src = first.url;
  }, [thumbnailCues]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.loop = loop && !isLive;
  }, [isLive, loop]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || status === "error") return;
    if (video.paused) {
      setStarted(true);
      await video.play();
    } else {
      video.pause();
    }
  }, [status]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const player = shakaRef.current;
    if (player?.isLive()) {
      const range = player.seekRange();
      video.currentTime = clamp(time, range.start, range.end);
    } else {
      video.currentTime = clamp(time, 0, video.duration || 0);
    }
  }, []);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (video) seekTo(video.currentTime + amount);
  }, [seekTo]);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(value, 0, 1);
    video.volume = next;
    video.muted = next === 0;
    setVolumeState(next);
    setMuted(next === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const selectQuality = useCallback((quality: "auto" | number) => {
    const player = shakaRef.current;
    if (!player) return;

    if (quality === "auto") {
      player.configure({ abr: { enabled: true } });
      setSelectedQuality("auto");
      return;
    }

    const option = qualities.find((item) => item.height === quality);
    if (!option) return;
    player.configure({ abr: { enabled: false } });
    player.selectVariantTrack(option.track, true);
    setSelectedQuality(quality);
  }, [qualities]);

  const selectTextTrack = useCallback((id: "off" | string) => {
    const video = videoRef.current;
    const player = shakaRef.current;
    if (!video) return;

    if (id === "off") {
      if (player) player.selectTextTrack(null);
      for (let index = 0; index < video.textTracks.length; index += 1) {
        video.textTracks[index].mode = "disabled";
      }
      setSelectedText("off");
      return;
    }

    const option = textOptions.find((item) => item.id === id);
    if (!option) return;

    if (player && option.track) {
      player.selectTextTrack(option.track);
    } else if (option.nativeIndex !== undefined) {
      for (let index = 0; index < video.textTracks.length; index += 1) {
        video.textTracks[index].mode = index === option.nativeIndex ? "showing" : "disabled";
      }
    }

    setSelectedText(id);
  }, [textOptions]);

  const selectAudioTrack = useCallback((id: string) => {
    const player = shakaRef.current;
    const option = audioOptions.find((item) => item.id === id);
    if (!player || !option) return;
    player.selectAudioTrack(option.track);
    setSelectedAudio(id);
    window.setTimeout(() => refreshAdaptiveTracks(player), 0);
  }, [audioOptions, refreshAdaptiveTracks]);

  const setCaptionStyle = useCallback((patch: Partial<VelaCaptionStyle>) => {
    setCaptionStyleState((current) => ({ ...current, ...patch }));
  }, []);

  const toggleCaptions = useCallback(() => {
    if (selectedText === "off") {
      const first = textOptions[0];
      if (first) selectTextTrack(first.id);
    } else {
      selectTextTrack("off");
    }
  }, [selectTextTrack, selectedText, textOptions]);

  const goLive = useCallback(() => {
    const player = shakaRef.current;
    if (!player?.isLive()) return;
    const range = player.seekRange();
    seekTo(Math.max(range.start, range.end - 0.35));
  }, [seekTo]);

  const jumpChapter = useCallback((direction: 1 | -1) => {
    if (!resolvedChapters.length) return;
    const currentIndex = Math.max(
      resolvedChapters.findIndex((chapter, index) => {
        const end = chapter.end ?? resolvedChapters[index + 1]?.start ?? timelineEnd;
        return currentTime >= chapter.start && currentTime < end;
      }),
      0,
    );
    const targetIndex = clamp(currentIndex + direction, 0, resolvedChapters.length - 1);
    seekTo(resolvedChapters[targetIndex].start);
  }, [currentTime, resolvedChapters, seekTo, timelineEnd]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!document.fullscreenElement) await shell.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !("pictureInPictureEnabled" in document)) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch {
      // PiP can be unavailable before metadata is ready or blocked by browser policy.
    }
  }, []);

  useImperativeHandle(ref, () => ({
    play: async () => {
      setStarted(true);
      await videoRef.current?.play();
    },
    pause: () => videoRef.current?.pause(),
    seek: seekTo,
    setVolume,
    setQuality: selectQuality,
    setTextTrack: selectTextTrack,
    setAudioTrack: selectAudioTrack,
    setCaptionStyle,
    goLive,
    nextChapter: () => jumpChapter(1),
    previousChapter: () => jumpChapter(-1),
    getState,
  }), [
    getState,
    goLive,
    jumpChapter,
    seekTo,
    selectAudioTrack,
    selectQuality,
    selectTextTrack,
    setCaptionStyle,
    setVolume,
  ]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "BUTTON" || tag === "SELECT") return;
    const key = event.key.toLowerCase();

    if (event.key === " " || key === "k") {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "ArrowLeft") seekBy(-5);
    else if (event.key === "ArrowRight") seekBy(5);
    else if (event.key === "ArrowUp") {
      event.preventDefault();
      setVolume(volume + 0.05);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setVolume(volume - 0.05);
    } else if (key === "j") seekBy(-10);
    else if (key === "l" && event.shiftKey) setLoop((value) => !value);
    else if (key === "l") seekBy(10);
    else if (key === "m") toggleMute();
    else if (key === "f") void toggleFullscreen();
    else if (key === "c") toggleCaptions();
    else if (key === "home") seekTo(timelineStart);
    else if (key === "end") isLive ? goLive() : seekTo(timelineEnd);
    else if (event.key === ">") onSpeedChange(Math.min(2, speed + 0.25));
    else if (event.key === "<") onSpeedChange(Math.max(0.5, speed - 0.25));
  };

  const handleTimelineMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setPreview({ x: ratio * 100, time: timelineStart + ratio * timelineSpan });
  };

  const updateRuntime = (video: HTMLVideoElement) => {
    setCurrentTime(video.currentTime);
    const player = shakaRef.current;
    if (player?.isLive()) {
      const range = player.seekRange();
      setSeekWindow(range);
      setLiveLatencyMs(player.getLiveLatency());
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  };

  function onSpeedChange(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
  }

  const handleMediaPointerDown = (event: ReactPointerEvent<HTMLVideoElement>) => {
    if (!gestures) return;
    gestureRef.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  };

  const handleMediaPointerUp = (event: ReactPointerEvent<HTMLVideoElement>) => {
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start) {
      if (event.pointerType === "mouse") void togglePlay();
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.at;

    if (event.pointerType === "touch" && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const amount = clamp(Math.round(dx / 7), -30, 30);
      seekBy(amount);
      flashGesture(`${amount > 0 ? "+" : ""}${amount}s`);
      return;
    }

    if (event.pointerType === "mouse") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && elapsed < 500) void togglePlay();
      return;
    }

    if (elapsed > 320) return;
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const zone: "left" | "center" | "right" = ratio < 0.34 ? "left" : ratio > 0.66 ? "right" : "center";
    const now = performance.now();
    const previous = lastTapRef.current;

    if (previous && previous.zone === zone && now - previous.at < 360) {
      lastTapRef.current = null;
      if (zone === "left") {
        seekBy(-10);
        flashGesture("−10s");
      } else if (zone === "right") {
        seekBy(10);
        flashGesture("+10s");
      } else {
        void togglePlay();
        flashGesture(playing ? "PAUSE" : "PLAY");
      }
    } else {
      lastTapRef.current = { zone, at: now };
      scheduleControls();
    }
  };

  const previewCue = preview ? findThumbnailCue(thumbnailCues, preview.time) : null;
  const previewImageStyle = useMemo<CSSProperties | undefined>(() => {
    if (!previewCue) return undefined;
    const base: CSSProperties = { backgroundImage: `url("${previewCue.url}")` };

    if (
      spriteSize && previewCue.width && previewCue.height &&
      previewCue.x !== undefined && previewCue.y !== undefined
    ) {
      const xDenominator = Math.max(spriteSize.width - previewCue.width, 1);
      const yDenominator = Math.max(spriteSize.height - previewCue.height, 1);
      return {
        ...base,
        backgroundSize: `${(spriteSize.width / previewCue.width) * 100}% ${(spriteSize.height / previewCue.height) * 100}%`,
        backgroundPosition: `${(previewCue.x / xDenominator) * 100}% ${(previewCue.y / yDenominator) * 100}%`,
      };
    }

    return { ...base, backgroundSize: "cover", backgroundPosition: "center" };
  }, [previewCue, spriteSize]);

  return (
    <div
      ref={shellRef}
      className={`vela-player ${controlsVisible ? "is-controls-visible" : ""} ${started ? "has-started" : ""} ${isLive ? "is-live" : ""}`}
      style={style}
      tabIndex={0}
      onPointerMove={scheduleControls}
      onPointerLeave={() => playing && !settingsOpen && setControlsVisible(false)}
      onFocus={scheduleControls}
      onKeyDown={handleKeyDown}
      aria-label={`${title} video player`}
      data-source-type={resolvedType}
    >
      <video
        ref={videoRef}
        className="vela-video"
        poster={poster}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onPointerDown={handleMediaPointerDown}
        onPointerUp={handleMediaPointerUp}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
          event.currentTarget.volume = volume;
        }}
        onDurationChange={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration);
        }}
        onTimeUpdate={(event) => updateRuntime(event.currentTarget)}
        onProgress={updateBuffered}
      >
        {!adaptive ? normalizedTracks.map((track) => (
          <track
            key={`${track.language}-${track.src}`}
            kind={track.kind ?? "subtitles"}
            src={track.src}
            srcLang={track.language}
            label={track.label}
            default={track.default}
          />
        )) : null}
      </video>

      <div className="vela-vignette" aria-hidden="true" />

      <div className="vela-engine-badge" aria-label={`${resolvedType} playback`}>
        <span className={`vela-status-dot is-${status}`} />
        {isLive ? "LIVE" : resolvedType.toUpperCase()}{adaptive && !isLive ? " / ABR" : ""}
      </div>

      {badges.length ? (
        <div className="vela-media-badges" aria-label="Media formats">
          {badges.map((badge) => <span key={badge}>{badge}</span>)}
        </div>
      ) : null}

      {gestureHint ? <div className="vela-gesture-hint" aria-live="polite">{gestureHint}</div> : null}

      {status === "error" ? (
        <div className="vela-error" role="alert">
          <small>STREAM ERROR</small>
          <strong>{errorMessage ?? "Unable to load video."}</strong>
        </div>
      ) : null}

      {!started && status !== "error" ? (
        <button className="vela-poster-action" type="button" onClick={() => void togglePlay()} aria-label="Play video">
          <span className="vela-start-icon"><Icon name="play" /></span>
          <span className="vela-start-copy">
            <small>{status === "loading" ? "PREPARING STREAM" : isLive ? "WATCH LIVE" : "PLAY FILM"}</small>
            <strong>{isLive ? "LIVE" : `00:00 — ${formatTime(duration)}`}</strong>
          </span>
        </button>
      ) : null}

      <div className="vela-title-block" aria-hidden="true">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>

      <div className="vela-controls" onPointerEnter={() => setControlsVisible(true)}>
        <div className="vela-timeline-wrap" onPointerMove={handleTimelineMove} onPointerLeave={() => setPreview(null)}>
          {preview ? (
            <div className="vela-preview" style={{ left: `${preview.x}%` }}>
              {previewImageStyle ? <div className="vela-preview-image" style={previewImageStyle} /> : <div className="vela-preview-empty" />}
              <span>{isLive ? `-${formatTime(Math.max(timelineEnd - preview.time, 0))}` : formatTime(preview.time)}</span>
            </div>
          ) : null}

          <div className="vela-timeline" aria-hidden="true">
            <span className="vela-buffered" style={{ width: `${bufferedProgress}%` }} />
            <span className="vela-progress" style={{ width: `${progress}%` }} />
            {resolvedChapters.map((chapter) => {
              if (!timelineSpan || chapter.start < timelineStart || chapter.start > timelineEnd) return null;
              return (
                <span
                  key={chapter.id ?? `${chapter.start}-${chapter.title}`}
                  className="vela-chapter-marker"
                  style={{ left: `${((chapter.start - timelineStart) / timelineSpan) * 100}%` }}
                />
              );
            })}
          </div>

          <input
            className="vela-seek-input"
            type="range"
            min={timelineStart}
            max={timelineEnd || timelineStart}
            step="0.01"
            value={clamp(currentTime, timelineStart, timelineEnd || timelineStart)}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label={isLive ? "Seek live DVR window" : "Seek video"}
          />
        </div>

        <div className="vela-control-row">
          <div className="vela-control-group">
            <button className="vela-icon-button primary" type="button" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
              <Icon name={playing ? "pause" : "play"} />
            </button>

            <div className="vela-volume-cluster">
              <button className="vela-icon-button" type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                <Icon name={muted || volume === 0 ? "muted" : "volume"} />
              </button>
              <input
                className="vela-volume-input"
                type="range"
                min={0}
                max={1}
                step="0.01"
                value={muted ? 0 : volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Volume"
              />
            </div>

            {isLive ? (
              <button className={`vela-live-button ${atLiveEdge ? "is-live-edge" : ""}`} type="button" onClick={goLive}>
                <span />
                {atLiveEdge ? "LIVE" : `GO LIVE · -${formatTime(Math.max(timelineEnd - currentTime, 0))}`}
              </button>
            ) : (
              <div className="vela-timecode" aria-label={`${formatTime(currentTime)} of ${formatTime(duration)}`}>
                <span>{formatTime(currentTime)}</span><i>/</i><span>{formatTime(duration)}</span>
              </div>
            )}

            {currentChapter ? <span className="vela-current-chapter">{currentChapter.title}</span> : null}
          </div>

          <div className="vela-control-group right">
            {textOptions.length ? (
              <button className={`vela-icon-button ${selectedText !== "off" ? "is-active" : ""}`} type="button" onClick={toggleCaptions} aria-label="Toggle captions">
                <Icon name="captions" />
              </button>
            ) : null}

            {!isLive ? (
              <button className={`vela-icon-button ${loop ? "is-active" : ""}`} type="button" onClick={() => setLoop((value) => !value)} aria-label="Toggle loop">
                <Icon name="loop" />
              </button>
            ) : null}

            <div className="vela-settings-menu">
              <button
                className={`vela-settings-button ${settingsOpen ? "is-active" : ""}`}
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                aria-expanded={settingsOpen}
                aria-label="Playback settings"
              >
                <span>{selectedQuality === "auto" ? "AUTO" : `${selectedQuality}P`}</span>
                <Icon name="settings" />
              </button>

              {settingsOpen ? (
                <div className="vela-popover vela-settings-popover" role="dialog" aria-label="Playback settings">
                  {audioOptions.length ? (
                    <section>
                      <span>AUDIO</span>
                      {audioOptions.map((option) => (
                        <button key={option.id} type="button" className={selectedAudio === option.id ? "selected" : ""} onClick={() => selectAudioTrack(option.id)}>
                          {option.label}<small>{option.language.toUpperCase()} · {option.detail}</small>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {qualities.length ? (
                    <section>
                      <span>QUALITY</span>
                      <button type="button" className={selectedQuality === "auto" ? "selected" : ""} onClick={() => selectQuality("auto")}>Auto <small>adaptive</small></button>
                      {qualities.map((option) => (
                        <button key={option.height} type="button" className={selectedQuality === option.height ? "selected" : ""} onClick={() => selectQuality(option.height)}>
                          {option.height}p <small>{(option.bandwidth / 1_000_000).toFixed(1)} Mbps</small>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {!isLive ? (
                    <section>
                      <span>SPEED</span>
                      <div className="vela-speed-grid">
                        {speeds.map((value) => (
                          <button key={value} type="button" className={speed === value ? "selected" : ""} onClick={() => onSpeedChange(value)}>{value}×</button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {textOptions.length ? (
                    <section>
                      <span>SUBTITLES</span>
                      <button type="button" className={selectedText === "off" ? "selected" : ""} onClick={() => selectTextTrack("off")}>Off</button>
                      {textOptions.map((option) => (
                        <button key={option.id} type="button" className={selectedText === option.id ? "selected" : ""} onClick={() => selectTextTrack(option.id)}>
                          {option.label}<small>{option.language.toUpperCase()}</small>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {textOptions.length ? (
                    <section>
                      <span>SUBTITLE STYLE</span>
                      <div className="vela-setting-label">SIZE</div>
                      <div className="vela-speed-grid">
                        {[0.8, 1, 1.2, 1.4].map((value) => (
                          <button key={value} type="button" className={captionStyleState.fontScale === value ? "selected" : ""} onClick={() => setCaptionStyle({ fontScale: value })}>{Math.round(value * 100)}%</button>
                        ))}
                      </div>
                      <div className="vela-setting-label">EDGE</div>
                      <div className="vela-speed-grid">
                        {(["none", "shadow", "outline"] as const).map((value) => (
                          <button key={value} type="button" className={captionStyleState.edge === value ? "selected" : ""} onClick={() => setCaptionStyle({ edge: value })}>{value}</button>
                        ))}
                      </div>
                      <div className="vela-setting-label">BACKGROUND</div>
                      <div className="vela-speed-grid">
                        {[0, 0.5, 0.82].map((value) => (
                          <button key={value} type="button" className={captionStyleState.backgroundOpacity === value ? "selected" : ""} onClick={() => setCaptionStyle({ backgroundOpacity: value })}>{Math.round(value * 100)}%</button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {resolvedChapters.length ? (
                    <section>
                      <span>CHAPTERS</span>
                      {resolvedChapters.map((chapter, index) => (
                        <button
                          key={chapter.id ?? `${chapter.start}-${chapter.title}`}
                          type="button"
                          className={currentChapter === chapter ? "selected" : ""}
                          onClick={() => seekTo(chapter.start)}
                        >
                          {chapter.title}<small>{formatTime(chapter.start)} · {String(index + 1).padStart(2, "0")}</small>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  <section className="vela-shortcuts">
                    <span>SHORTCUTS / GESTURES</span>
                    <p><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> seek / play · <kbd>C</kbd> captions · <kbd>F</kbd> fullscreen</p>
                    <p>double tap ±10s · swipe horizontally up to ±30s</p>
                  </section>
                </div>
              ) : null}
            </div>

            <button className="vela-icon-button desktop-only" type="button" onClick={() => void togglePip()} aria-label="Picture in picture"><Icon name="pip" /></button>
            <button className="vela-icon-button" type="button" onClick={() => void toggleFullscreen()} aria-label="Fullscreen"><Icon name="fullscreen" /></button>
          </div>
        </div>
      </div>
    </div>
  );
});
