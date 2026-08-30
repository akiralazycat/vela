"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AudioOption, QualityOption, TextOption } from "./core/adaptive";
import { detectSourceType } from "./core/adaptive";
import type {
  PlayerLoadStatus,
  VelaChapter,
  VelaSourceType,
  VelaTextTrack,
} from "./core/contracts";
import {
  type AdaptiveLiveSnapshot,
  type AdaptiveTrackSnapshot,
  useAdaptivePlaybackEngine,
} from "./useAdaptivePlaybackEngine";

type UsePlaybackEngineOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  sourceType: VelaSourceType;
  captionsSrc?: string;
  textTracks: readonly VelaTextTrack[];
  chapters: readonly VelaChapter[];
  chapterLanguage: string;
  autoPlay: boolean;
  onReady?: () => void;
};

function nativeMediaErrorMessage(error: MediaError | null) {
  if (!error) return "The media source could not be loaded.";
  if (error.code === MediaError.MEDIA_ERR_ABORTED) return "Media loading was aborted.";
  if (error.code === MediaError.MEDIA_ERR_NETWORK) return "A network error interrupted media loading.";
  if (error.code === MediaError.MEDIA_ERR_DECODE) return "The browser could not decode this media.";
  if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return "This media source or format is not supported.";
  return error.message || "The media source could not be loaded.";
}

function playbackErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; code?: unknown };
    if (typeof candidate.message === "string" && candidate.message) return candidate.message;
    if (typeof candidate.code === "number") return `${fallback} (code ${candidate.code})`;
  }
  return fallback;
}

function waitForNativeMetadata(media: HTMLVideoElement, signal: AbortSignal) {
  if (media.error) return Promise.reject(new Error(nativeMediaErrorMessage(media.error)));
  if (media.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener("loadedmetadata", onLoadedMetadata);
      media.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onLoadedMetadata = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(nativeMediaErrorMessage(media.error)));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Playback load aborted", "AbortError"));
    };

    media.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    media.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function usePlaybackEngine({
  videoRef,
  src,
  sourceType,
  captionsSrc,
  textTracks,
  chapters,
  chapterLanguage,
  autoPlay,
  onReady,
}: UsePlaybackEngineOptions) {
  const onReadyRef = useRef(onReady);
  const {
    playerRef,
    load: loadAdaptive,
    dispose: disposeAdaptive,
    readTracks,
    readLive,
  } = useAdaptivePlaybackEngine();

  const resolvedType = useMemo(() => detectSourceType(src, sourceType), [src, sourceType]);
  const adaptive = resolvedType === "hls" || resolvedType === "dash";
  const normalizedTracks = useMemo<VelaTextTrack[]>(() => {
    if (!captionsSrc) return [...textTracks];
    if (textTracks.some((track) => track.src === captionsSrc)) return [...textTracks];
    return [{ src: captionsSrc, language: "en", label: "English", kind: "subtitles" }, ...textTracks];
  }, [captionsSrc, textTracks]);
  const sessionKey = useMemo(() => [
    resolvedType,
    src,
    chapterLanguage,
    autoPlay ? "autoplay" : "manual",
    normalizedTracks.map((track) => `${track.language}:${track.kind ?? "subtitles"}:${track.src}`).join("|"),
    chapters.map((chapter) => `${chapter.id ?? ""}:${chapter.start}:${chapter.end ?? ""}:${chapter.title}`).join("|"),
  ].join("::"), [autoPlay, chapterLanguage, chapters, normalizedTracks, resolvedType, src]);

  const [status, setStatus] = useState<PlayerLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<"auto" | number>("auto");
  const [textOptions, setTextOptions] = useState<TextOption[]>([]);
  const [selectedText, setSelectedText] = useState<"off" | string>("off");
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [resolvedChapters, setResolvedChapters] = useState<VelaChapter[]>([...chapters]);
  const [isLive, setIsLive] = useState(false);
  const [seekWindow, setSeekWindow] = useState({ start: 0, end: 0 });
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const applyTrackSnapshot = useCallback((snapshot: AdaptiveTrackSnapshot) => {
    setQualities(snapshot.qualities);
    setTextOptions(snapshot.textOptions);
    setSelectedText(snapshot.selectedText);
    setAudioOptions(snapshot.audioOptions);
    setSelectedAudio(snapshot.selectedAudio);
    setBadges(snapshot.badges);
  }, []);

  const applyLiveSnapshot = useCallback((snapshot: AdaptiveLiveSnapshot) => {
    setIsLive(snapshot.isLive);
    setSeekWindow(snapshot.seekWindow);
    setLiveLatencyMs(snapshot.liveLatencyMs);
  }, []);

  const resetEngineState = useCallback(() => {
    setStatus("loading");
    setErrorMessage(null);
    setQualities([]);
    setSelectedQuality("auto");
    setTextOptions([]);
    setSelectedText("off");
    setAudioOptions([]);
    setSelectedAudio(null);
    setBadges([]);
    setResolvedChapters([...chapters]);
    setIsLive(false);
    setSeekWindow({ start: 0, end: 0 });
    setLiveLatencyMs(null);
  }, [chapters]);

  useEffect(() => {
    const currentMedia = videoRef.current;
    if (!currentMedia) return;
    const media: HTMLVideoElement = currentMedia;
    const controller = new AbortController();

    resetEngineState();

    const syncNativeTextTracks = () => {
      if (adaptive || controller.signal.aborted) return;
      const elements = Array.from(media.querySelectorAll("track"));
      const mediaTracks = Array.from(media.textTracks);
      const options = normalizedTracks.map((track, configuredIndex) => {
        const configuredTrack = elements[configuredIndex]?.track;
        const actualIndex = configuredTrack ? mediaTracks.indexOf(configuredTrack) : -1;
        return {
          id: `native-${configuredIndex}`,
          label: track.label,
          language: track.language,
          nativeIndex: actualIndex >= 0 ? actualIndex : configuredIndex,
        } satisfies TextOption;
      });
      setTextOptions(options);
      const active = options.find((option) => (
        option.nativeIndex !== undefined && media.textTracks[option.nativeIndex]?.mode === "showing"
      ));
      setSelectedText(active?.id ?? "off");
    };

    const handleNativeRuntimeError = () => {
      if (controller.signal.aborted || adaptive) return;
      setStatus("error");
      setErrorMessage(nativeMediaErrorMessage(media.error));
    };
    if (!adaptive) {
      media.addEventListener("error", handleNativeRuntimeError);
      media.textTracks.addEventListener("change", syncNativeTextTracks);
      media.textTracks.addEventListener("addtrack", syncNativeTextTracks);
      media.textTracks.addEventListener("removetrack", syncNativeTextTracks);
    }

    async function load() {
      try {
        if (adaptive) {
          await loadAdaptive({
            media,
            src,
            resolvedType,
            textTracks: normalizedTracks,
            chapters,
            chapterLanguage,
            signal: controller.signal,
            onTracks: applyTrackSnapshot,
            onLive: applyLiveSnapshot,
            onChapters: setResolvedChapters,
            onEngineError: (error) => {
              if (controller.signal.aborted) return;
              setStatus("error");
              setErrorMessage(playbackErrorMessage(error, "The adaptive stream could not continue."));
            },
          });
        } else {
          media.src = src;
          syncNativeTextTracks();
          media.load();
          await waitForNativeMetadata(media, controller.signal);
          syncNativeTextTracks();
        }

        if (controller.signal.aborted) return;
        setStatus("ready");
        onReadyRef.current?.();

        if (autoPlay) {
          try {
            await media.play();
          } catch (error) {
            if (controller.signal.aborted) return;
            if (media.error) {
              setStatus("error");
              setErrorMessage(nativeMediaErrorMessage(media.error));
            } else if (!(error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError"))) {
              // A source can be fully ready even when the browser declines autoplay.
              // Non-media play() failures therefore leave the player ready for a user gesture.
              console.warn("Vela autoplay was not started", error);
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setErrorMessage(playbackErrorMessage(error, "Vela could not load this source."));
      }
    }

    void load();

    return () => {
      controller.abort();
      if (!adaptive) {
        media.removeEventListener("error", handleNativeRuntimeError);
        media.textTracks.removeEventListener("change", syncNativeTextTracks);
        media.textTracks.removeEventListener("addtrack", syncNativeTextTracks);
        media.textTracks.removeEventListener("removetrack", syncNativeTextTracks);
      }
      void disposeAdaptive();
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  }, [
    adaptive,
    applyLiveSnapshot,
    applyTrackSnapshot,
    autoPlay,
    chapterLanguage,
    chapters,
    disposeAdaptive,
    loadAdaptive,
    normalizedTracks,
    resetEngineState,
    resolvedType,
    src,
    videoRef,
  ]);

  const refreshAdaptiveTracks = useCallback(() => {
    const snapshot = readTracks();
    if (snapshot) applyTrackSnapshot(snapshot);
  }, [applyTrackSnapshot, readTracks]);

  const refreshLiveInfo = useCallback(() => {
    const snapshot = readLive();
    if (snapshot) applyLiveSnapshot(snapshot);
  }, [applyLiveSnapshot, readLive]);

  const selectQuality = useCallback((quality: "auto" | number) => {
    const player = playerRef.current;
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
  }, [playerRef, qualities]);

  const selectTextTrack = useCallback((id: "off" | string) => {
    const video = videoRef.current;
    const player = playerRef.current;
    if (!video) return;

    if (id === "off") {
      if (player) void player.setTextTrackVisibility(false);
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
      void player.setTextTrackVisibility(true);
    } else if (option.nativeIndex !== undefined) {
      for (let index = 0; index < video.textTracks.length; index += 1) {
        video.textTracks[index].mode = index === option.nativeIndex ? "showing" : "disabled";
      }
    }
    setSelectedText(id);
  }, [playerRef, textOptions, videoRef]);

  const selectAudioTrack = useCallback((id: string) => {
    const player = playerRef.current;
    const option = audioOptions.find((item) => item.id === id);
    if (!player || !option) return;
    player.selectAudioTrack(option.track);
    setSelectedAudio(id);
    window.setTimeout(refreshAdaptiveTracks, 0);
  }, [audioOptions, playerRef, refreshAdaptiveTracks]);

  return {
    adaptivePlayerRef: playerRef,
    sessionKey,
    resolvedType,
    adaptive,
    normalizedTracks,
    status,
    errorMessage,
    qualities,
    selectedQuality,
    textOptions,
    selectedText,
    audioOptions,
    selectedAudio,
    badges,
    resolvedChapters,
    isLive,
    seekWindow,
    liveLatencyMs,
    selectQuality,
    selectTextTrack,
    selectAudioTrack,
    refreshAdaptiveTracks,
    refreshLiveInfo,
  };
}
