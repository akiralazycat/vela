"use client";

import {
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from "react";
import type { TextOption } from "./core/adaptive";
import type {
  VelaCaptionStyle,
  VelaChapter,
  VelaPlayerHandle,
  VelaPlayerState,
  VelaSourceType,
} from "./core/contracts";
import { clamp } from "./core/utils";

type UsePlayerControllerOptions = {
  ref: ForwardedRef<VelaPlayerHandle>;
  shellRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  timelineStart: number;
  timelineEnd: number;
  timelineSpan: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  speed: number;
  isLive: boolean;
  atLiveEdge: boolean;
  liveLatencyMs: number | null;
  selectedQuality: "auto" | number;
  selectedText: "off" | string;
  selectedAudio: string | null;
  resolvedType: Exclude<VelaSourceType, "auto">;
  badges: readonly string[];
  chapters: readonly VelaChapter[];
  textOptions: readonly TextOption[];
  onStateChange?: (state: VelaPlayerState) => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void | Promise<void>;
  seekTo: (time: number) => void;
  seekBy: (amount: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (value: number) => void;
  toggleLoop: () => void;
  goLive: () => void;
  selectQuality: (quality: "auto" | number) => void;
  selectTextTrack: (track: "off" | string) => void;
  selectAudioTrack: (track: string) => void;
  setCaptionStyle: (style: Partial<VelaCaptionStyle>) => void;
};

export function usePlayerController({
  ref,
  shellRef,
  videoRef,
  currentTime,
  duration,
  timelineStart,
  timelineEnd,
  timelineSpan,
  playing,
  volume,
  muted,
  speed,
  isLive,
  atLiveEdge,
  liveLatencyMs,
  selectedQuality,
  selectedText,
  selectedAudio,
  resolvedType,
  badges,
  chapters,
  textOptions,
  onStateChange,
  play,
  pause,
  togglePlay,
  seekTo,
  seekBy,
  setVolume,
  toggleMute,
  setPlaybackRate,
  toggleLoop,
  goLive,
  selectQuality,
  selectTextTrack,
  selectAudioTrack,
  setCaptionStyle,
}: UsePlayerControllerOptions) {
  const currentChapter = useMemo(() => {
    return chapters.find((chapter, index) => {
      const end = chapter.end ?? chapters[index + 1]?.start ?? timelineEnd;
      return currentTime >= chapter.start && currentTime < end;
    }) ?? null;
  }, [chapters, currentTime, timelineEnd]);

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
    mediaBadges: [...badges],
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

  const toggleCaptions = useCallback(() => {
    if (selectedText === "off") {
      const first = textOptions[0];
      if (first) selectTextTrack(first.id);
    } else {
      selectTextTrack("off");
    }
  }, [selectTextTrack, selectedText, textOptions]);

  const jumpChapter = useCallback((direction: 1 | -1) => {
    if (!chapters.length) return;
    const currentIndex = Math.max(
      chapters.findIndex((chapter, index) => {
        const end = chapter.end ?? chapters[index + 1]?.start ?? timelineEnd;
        return currentTime >= chapter.start && currentTime < end;
      }),
      0,
    );
    const targetIndex = clamp(currentIndex + direction, 0, chapters.length - 1);
    seekTo(chapters[targetIndex].start);
  }, [chapters, currentTime, seekTo, timelineEnd]);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!document.fullscreenElement) await shell.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, [shellRef]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !("pictureInPictureEnabled" in document)) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch {
      // PiP can be unavailable before metadata is ready or blocked by browser policy.
    }
  }, [videoRef]);

  useImperativeHandle(ref, () => ({
    play,
    pause,
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
    pause,
    play,
    seekTo,
    selectAudioTrack,
    selectQuality,
    selectTextTrack,
    setCaptionStyle,
    setVolume,
  ]);

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (target?.isContentEditable || tag === "INPUT" || tag === "BUTTON" || tag === "SELECT" || tag === "TEXTAREA") {
      return;
    }

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
    else if (key === "l" && event.shiftKey) toggleLoop();
    else if (key === "l") seekBy(10);
    else if (key === "m") toggleMute();
    else if (key === "f") void toggleFullscreen();
    else if (key === "c") toggleCaptions();
    else if (key === "home") seekTo(timelineStart);
    else if (key === "end") isLive ? goLive() : seekTo(timelineEnd);
    else if (event.key === ">") setPlaybackRate(Math.min(2, speed + 0.25));
    else if (event.key === "<") setPlaybackRate(Math.max(0.5, speed - 0.25));
  }, [
    goLive,
    isLive,
    seekBy,
    seekTo,
    setPlaybackRate,
    setVolume,
    speed,
    timelineEnd,
    timelineStart,
    toggleCaptions,
    toggleFullscreen,
    toggleLoop,
    toggleMute,
    togglePlay,
    volume,
  ]);

  return {
    currentChapter,
    getState,
    toggleCaptions,
    toggleFullscreen,
    togglePip,
    handleKeyDown,
  };
}
