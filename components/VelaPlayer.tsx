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
import { findThumbnailCue, loadThumbnailVtt, type ThumbnailCue } from "@/lib/thumbnail-vtt";

export type VelaSourceType = "auto" | "hls" | "dash" | "mp4";

export type VelaTextTrack = {
  src: string;
  language: string;
  label: string;
  kind?: "subtitles" | "captions";
  mimeType?: string;
  default?: boolean;
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
  sourceType: Exclude<VelaSourceType, "auto">;
};

export type VelaPlayerHandle = {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setQuality: (quality: "auto" | number) => void;
  setTextTrack: (track: "off" | string) => void;
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
  theme?: Partial<VelaTheme>;
  autoPlay?: boolean;
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
};

type AdaptivePlayer = {
  attach: (video: HTMLMediaElement) => Promise<void>;
  load: (uri: string, startTime?: number, mimeType?: string) => Promise<void>;
  destroy: () => Promise<void>;
  configure: (config: Record<string, unknown>) => void;
  addEventListener: (type: string, listener: EventListener) => void;
  getVariantTracks: () => AdaptiveTrack[];
  selectVariantTrack: (track: AdaptiveTrack, clearBuffer?: boolean) => void;
  getTextTracks: () => AdaptiveTrack[];
  selectTextTrack: (track: AdaptiveTrack) => void;
  setTextTrackVisibility: (visible: boolean) => void;
  addTextTrackAsync: (
    uri: string,
    language: string,
    kind?: string,
    mimeType?: string,
    codecs?: string,
  ) => Promise<unknown>;
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

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
const defaultTheme: VelaTheme = {
  accent: "#d8ff62",
  surface: "#080908",
  foreground: "#ffffff",
  muted: "#a5a79f",
  radius: 0,
  blur: 18,
  controlsOpacity: 0.76,
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
    textTracks = [],
    thumbnailVtt,
    theme,
    autoPlay = false,
    onReady,
    onStateChange,
  },
  ref,
) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shakaRef = useRef<AdaptivePlayer | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedType = useMemo(() => detectSourceType(src, sourceType), [src, sourceType]);
  const adaptive = resolvedType === "hls" || resolvedType === "dash";
  const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme, accent: accent ?? theme?.accent ?? defaultTheme.accent }), [accent, theme]);
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
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
  const [spriteSize, setSpriteSize] = useState<{ width: number; height: number } | null>(null);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0;
  const style = useMemo(() => ({
    "--vela-accent": mergedTheme.accent,
    "--vela-surface": mergedTheme.surface,
    "--vela-foreground": mergedTheme.foreground,
    "--vela-muted": mergedTheme.muted,
    "--vela-radius": `${mergedTheme.radius}px`,
    "--vela-blur": `${mergedTheme.blur}px`,
    "--vela-controls-opacity": mergedTheme.controlsOpacity,
  }) as CSSProperties, [mergedTheme]);

  const getState = useCallback((): VelaPlayerState => ({
    currentTime,
    duration,
    paused: !playing,
    volume,
    muted,
    quality: selectedQuality,
    textTrack: selectedText,
    sourceType: resolvedType,
  }), [currentTime, duration, muted, playing, resolvedType, selectedQuality, selectedText, volume]);

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

  const refreshAdaptiveTracks = useCallback((player: AdaptivePlayer) => {
    const variants = player.getVariantTracks();
    const activeLanguage = variants.find((track) => track.active)?.language;
    const byHeight = new Map<number, AdaptiveTrack>();
    for (const track of variants) {
      if (!track.height || (activeLanguage && track.language !== activeLanguage)) continue;
      const previous = byHeight.get(track.height);
      if (!previous || track.bandwidth > previous.bandwidth) byHeight.set(track.height, track);
    }
    setQualities(
      Array.from(byHeight.entries())
        .map(([height, track]) => ({ height, bandwidth: track.bandwidth, track }))
        .sort((a, b) => b.height - a.height),
    );

    const texts = player.getTextTracks();
    setTextOptions(texts.map((track) => ({
      id: String(track.id),
      label: track.label || track.language || `Track ${track.id}`,
      language: track.language,
      track,
    })));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let instance: AdaptivePlayer | null = null;

    setStatus("loading");
    setErrorMessage(null);
    setSelectedQuality("auto");
    setSelectedText("off");
    setQualities([]);
    setTextOptions([]);
    setStarted(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const onEngineError: EventListener = () => {
      if (!disposed) {
        setStatus("error");
        setErrorMessage("The adaptive stream could not be loaded.");
      }
    };

    async function load() {
      try {
        if (adaptive) {
          video.removeAttribute("src");
          video.load();
          const module = await import("shaka-player");
          const candidate = module as unknown as { default?: ShakaNamespace };
          const shaka = candidate.default ?? (module as unknown as ShakaNamespace);
          shaka.polyfill.installAll();
          if (shaka.Player.isBrowserSupported && !shaka.Player.isBrowserSupported()) {
            throw new Error("Adaptive playback is not supported in this browser.");
          }

          instance = new shaka.Player();
          shakaRef.current = instance;
          instance.addEventListener("error", onEngineError);
          instance.configure({ abr: { enabled: true } });
          await instance.attach(video);
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
        } else {
          shakaRef.current = null;
          video.src = src;
          video.load();
          setTextOptions(normalizedTracks.map((track, nativeIndex) => ({
            id: `native-${nativeIndex}`,
            label: track.label,
            language: track.language,
            nativeIndex,
          })));
        }

        if (disposed) return;
        setStatus("ready");
        onReady?.();
        if (autoPlay) {
          setStarted(true);
          await video.play();
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
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [adaptive, autoPlay, normalizedTracks, onReady, refreshAdaptiveTracks, resolvedType, src]);

  useEffect(() => {
    if (!thumbnailVtt) {
      setThumbnailCues([]);
      setSpriteSize(null);
      return;
    }
    const controller = new AbortController();
    loadThumbnailVtt(thumbnailVtt, controller.signal)
      .then((cues) => setThumbnailCues(cues))
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
    if (video) video.loop = loop;
  }, [loop]);

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
    video.currentTime = Math.min(Math.max(time, 0), video.duration || 0);
  }, []);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(video.currentTime + amount);
  }, [seekTo]);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(Math.max(value, 0), 1);
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
      if (player) player.setTextTrackVisibility(false);
      for (let index = 0; index < video.textTracks.length; index += 1) video.textTracks[index].mode = "disabled";
      setSelectedText("off");
      return;
    }

    const option = textOptions.find((item) => item.id === id);
    if (!option) return;
    if (player && option.track) {
      player.selectTextTrack(option.track);
      player.setTextTrackVisibility(true);
    } else if (option.nativeIndex !== undefined) {
      for (let index = 0; index < video.textTracks.length; index += 1) {
        video.textTracks[index].mode = index === option.nativeIndex ? "showing" : "disabled";
      }
    }
    setSelectedText(id);
  }, [textOptions]);

  const toggleCaptions = useCallback(() => {
    if (selectedText === "off") {
      const first = textOptions[0];
      if (first) selectTextTrack(first.id);
    } else {
      selectTextTrack("off");
    }
  }, [selectTextTrack, selectedText, textOptions]);

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
      // PiP can be blocked by browser policy or unavailable before metadata is ready.
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
    getState,
  }), [getState, seekTo, selectQuality, selectTextTrack, setVolume]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "BUTTON") return;
    if ([" ", "k", "K"].includes(event.key)) {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "ArrowLeft") seekBy(-5);
    else if (event.key === "ArrowRight") seekBy(5);
    else if (["m", "M"].includes(event.key)) toggleMute();
    else if (["f", "F"].includes(event.key)) void toggleFullscreen();
    else if (["c", "C"].includes(event.key)) toggleCaptions();
    else if (["l", "L"].includes(event.key)) setLoop((value) => !value);
  };

  const handleTimelineMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    setPreview({ x: ratio * 100, time: ratio * duration });
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  };

  const onSpeedChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
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
      className={`vela-player ${controlsVisible ? "is-controls-visible" : ""} ${started ? "has-started" : ""}`}
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
        onClick={() => void togglePlay()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          event.currentTarget.volume = volume;
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
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
        {resolvedType.toUpperCase()}{adaptive ? " / ABR" : ""}
      </div>

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
            <small>{status === "loading" ? "PREPARING STREAM" : "PLAY FILM"}</small>
            <strong>00:00 — {formatTime(duration)}</strong>
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
              <div className="vela-preview-image" style={previewImageStyle} />
              <span>{formatTime(preview.time)}</span>
            </div>
          ) : null}
          <div className="vela-timeline" aria-hidden="true">
            <span className="vela-buffered" style={{ width: `${bufferedProgress}%` }} />
            <span className="vela-progress" style={{ width: `${progress}%` }} />
          </div>
          <input
            className="vela-seek-input"
            type="range"
            min={0}
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="Seek video"
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
              <input className="vela-volume-input" type="range" min={0} max={1} step="0.01" value={muted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" />
            </div>
            <div className="vela-timecode" aria-label={`${formatTime(currentTime)} of ${formatTime(duration)}`}>
              <span>{formatTime(currentTime)}</span><i>/</i><span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="vela-control-group right">
            {textOptions.length ? (
              <button className={`vela-icon-button ${selectedText !== "off" ? "is-active" : ""}`} type="button" onClick={toggleCaptions} aria-label="Toggle captions">
                <Icon name="captions" />
              </button>
            ) : null}
            <button className={`vela-icon-button ${loop ? "is-active" : ""}`} type="button" onClick={() => setLoop((value) => !value)} aria-label="Toggle loop">
              <Icon name="loop" />
            </button>

            <div className="vela-settings-menu">
              <button className={`vela-settings-button ${settingsOpen ? "is-active" : ""}`} type="button" onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen} aria-label="Playback settings">
                <span>{selectedQuality === "auto" ? "AUTO" : `${selectedQuality}P`}</span>
                <Icon name="settings" />
              </button>
              {settingsOpen ? (
                <div className="vela-popover vela-settings-popover" role="dialog" aria-label="Playback settings">
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
                  <section>
                    <span>SPEED</span>
                    <div className="vela-speed-grid">
                      {speeds.map((value) => (
                        <button key={value} type="button" className={speed === value ? "selected" : ""} onClick={() => onSpeedChange(value)}>{value}×</button>
                      ))}
                    </div>
                  </section>
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
