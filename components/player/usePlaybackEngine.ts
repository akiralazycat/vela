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
  onReset?: () => void;
  onAutoPlayStart?: () => void;
};

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
  onReset,
  onAutoPlayStart,
}: UsePlaybackEngineOptions) {
  const callbacksRef = useRef({ onReady, onReset, onAutoPlayStart });
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
    callbacksRef.current = { onReady, onReset, onAutoPlayStart };
  }, [onAutoPlayStart, onReady, onReset]);

  const applyTrackSnapshot = useCallback((snapshot: AdaptiveTrackSnapshot) => {
    setQualities(snapshot.qualities);
    setTextOptions(snapshot.textOptions);
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
    callbacksRef.current.onReset?.();

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
            onEngineError: () => {
              if (controller.signal.aborted) return;
              setStatus("error");
              setErrorMessage("The adaptive stream could not be loaded.");
            },
          });
        } else {
          media.src = src;
          media.load();
          setTextOptions(normalizedTracks.map((track, nativeIndex) => ({
            id: `native-${nativeIndex}`,
            label: track.label,
            language: track.language,
            nativeIndex,
          })));
        }

        if (controller.signal.aborted) return;
        setStatus("ready");
        callbacksRef.current.onReady?.();

        if (autoPlay) {
          callbacksRef.current.onAutoPlayStart?.();
          await media.play();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Vela could not load this source.");
      }
    }

    void load();

    return () => {
      controller.abort();
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
