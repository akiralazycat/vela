"use client";

import { useCallback, useRef } from "react";
import {
  audioDetail,
  audioId,
  mediaBadges,
  sourceMime,
  type AdaptivePlayer,
  type AdaptiveTrack,
  type AudioOption,
  type QualityOption,
  type ShakaNamespace,
  type TextOption,
} from "./core/adaptive";
import type { VelaChapter, VelaSourceType, VelaTextTrack } from "./core/contracts";

export type AdaptiveTrackSnapshot = {
  qualities: QualityOption[];
  textOptions: TextOption[];
  audioOptions: AudioOption[];
  selectedAudio: string | null;
  badges: string[];
};

export type AdaptiveLiveSnapshot = {
  isLive: boolean;
  seekWindow: { start: number; end: number };
  liveLatencyMs: number | null;
};

type LoadAdaptiveOptions = {
  media: HTMLVideoElement;
  src: string;
  resolvedType: Exclude<VelaSourceType, "auto">;
  textTracks: readonly VelaTextTrack[];
  chapters: readonly VelaChapter[];
  chapterLanguage: string;
  signal: AbortSignal;
  onTracks: (snapshot: AdaptiveTrackSnapshot) => void;
  onLive: (snapshot: AdaptiveLiveSnapshot) => void;
  onChapters: (chapters: VelaChapter[]) => void;
  onEngineError: () => void;
};

function collectTrackSnapshot(player: AdaptivePlayer): AdaptiveTrackSnapshot {
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

  const qualities = Array.from(byHeight.entries())
    .map(([height, track]) => ({ height, bandwidth: track.bandwidth, track }))
    .sort((a, b) => b.height - a.height);

  const textOptions = player.getTextTracks().map((track) => ({
    id: String(track.id),
    label: track.label || track.language || `Track ${track.id}`,
    language: track.language,
    track,
  }));

  const audioTracks = player.getAudioTracks();
  const audioOptions = audioTracks.map((track, index) => ({
    id: audioId(track, index),
    label: track.label || track.language.toUpperCase() || `Audio ${index + 1}`,
    language: track.language,
    detail: audioDetail(track),
    track,
  }));
  const activeAudio = audioTracks.find((track) => track.active) ?? audioTracks[0];

  return {
    qualities,
    textOptions,
    audioOptions,
    selectedAudio: audioOptions.find((option) => option.track.active)?.id ?? audioOptions[0]?.id ?? null,
    badges: mediaBadges(activeVariant, activeAudio),
  };
}

function collectLiveSnapshot(player: AdaptivePlayer): AdaptiveLiveSnapshot {
  if (!player.isLive()) {
    return { isLive: false, seekWindow: { start: 0, end: 0 }, liveLatencyMs: null };
  }
  return {
    isLive: true,
    seekWindow: player.seekRange(),
    liveLatencyMs: player.getLiveLatency(),
  };
}

export function useAdaptivePlaybackEngine() {
  const playerRef = useRef<AdaptivePlayer | null>(null);

  const dispose = useCallback(async () => {
    const player = playerRef.current;
    playerRef.current = null;
    if (player) await player.destroy();
  }, []);

  const readTracks = useCallback(() => {
    const player = playerRef.current;
    return player ? collectTrackSnapshot(player) : null;
  }, []);

  const readLive = useCallback(() => {
    const player = playerRef.current;
    return player ? collectLiveSnapshot(player) : null;
  }, []);

  const load = useCallback(async ({
    media,
    src,
    resolvedType,
    textTracks,
    chapters,
    chapterLanguage,
    signal,
    onTracks,
    onLive,
    onChapters,
    onEngineError,
  }: LoadAdaptiveOptions) => {
    media.removeAttribute("src");
    media.load();

    const module = await import("shaka-player");
    const candidate = module as unknown as { default?: ShakaNamespace };
    const shaka = candidate.default ?? (module as unknown as ShakaNamespace);
    shaka.polyfill.installAll();

    if (shaka.Player.isBrowserSupported && !shaka.Player.isBrowserSupported()) {
      throw new Error("Adaptive playback is not supported in this browser.");
    }

    const instance = new shaka.Player();
    playerRef.current = instance;

    const active = () => !signal.aborted && playerRef.current === instance;
    const emitTracks = () => {
      if (active()) onTracks(collectTrackSnapshot(instance));
    };
    const emitLive = () => {
      if (active()) onLive(collectLiveSnapshot(instance));
    };

    instance.addEventListener("error", () => {
      if (active()) onEngineError();
    });
    instance.addEventListener("trackschanged", emitTracks as EventListener);
    instance.addEventListener("variantchanged", emitTracks as EventListener);
    instance.addEventListener("audiotrackchanged", emitTracks as EventListener);
    instance.addEventListener("manifestupdated", emitLive as EventListener);

    try {
      instance.configure({ abr: { enabled: true } });
      await instance.attach(media);
      await instance.load(src, undefined, sourceMime(resolvedType));

      for (const track of textTracks) {
        if (signal.aborted) break;
        await instance.addTextTrackAsync(
          track.src,
          track.language,
          track.kind ?? "subtitles",
          track.mimeType ?? "text/vtt",
        );
      }

      if (!active()) return;
      emitTracks();
      emitLive();

      if (!chapters.length) {
        const chapterTracks = instance.getChaptersTracks();
        const language = chapterTracks.find((track) => track.language === chapterLanguage)?.language
          ?? chapterTracks[0]?.language;
        if (language) {
          const manifestChapters = await instance.getChaptersAsync(language);
          if (active()) {
            onChapters(manifestChapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              start: chapter.startTime,
              end: chapter.endTime,
            })));
          }
        }
      }
    } catch (error) {
      if (signal.aborted) return;
      throw error;
    }
  }, []);

  return {
    playerRef,
    load,
    dispose,
    readTracks,
    readLive,
  };
}
