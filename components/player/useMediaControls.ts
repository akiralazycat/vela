"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { AdaptivePlayer } from "./core/adaptive";
import type { PlayerLoadStatus } from "./core/contracts";
import { clamp } from "./core/utils";

type UseMediaControlsOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  adaptivePlayerRef: RefObject<AdaptivePlayer | null>;
  isLive: boolean;
  status: PlayerLoadStatus;
  refreshLiveInfo: () => void;
  sessionKey: string;
  initialVolume?: number;
};

export function useMediaControls({
  videoRef,
  adaptivePlayerRef,
  isLive,
  status,
  refreshLiveInfo,
  sessionKey,
  initialVolume = 0.82,
}: UseMediaControlsOptions) {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(initialVolume);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    setStarted(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
  }, [sessionKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.loop = loop && !isLive;
  }, [isLive, loop, videoRef]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || status === "error") return;
    setStarted(true);
    await video.play();
  }, [status, videoRef]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || status === "error") return;
    if (video.paused) await play();
    else video.pause();
  }, [play, status, videoRef]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const player = adaptivePlayerRef.current;
    if (player?.isLive()) {
      const range = player.seekRange();
      video.currentTime = clamp(time, range.start, range.end);
    } else {
      video.currentTime = clamp(time, 0, video.duration || 0);
    }
  }, [adaptivePlayerRef, videoRef]);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (video) seekTo(video.currentTime + amount);
  }, [seekTo, videoRef]);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(value, 0, 1);
    video.volume = next;
    video.muted = next === 0;
    setVolumeState(next);
    setMuted(next === 0);
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, [videoRef]);

  const setPlaybackRate = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
  }, [videoRef]);

  const toggleLoop = useCallback(() => {
    setLoop((value) => !value);
  }, []);

  const goLive = useCallback(() => {
    const player = adaptivePlayerRef.current;
    if (!player?.isLive()) return;
    const range = player.seekRange();
    seekTo(Math.max(range.start, range.end - 0.35));
  }, [adaptivePlayerRef, seekTo]);

  const handlePlay = useCallback(() => {
    setStarted(true);
    setPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setPlaying(false);
  }, []);

  const handleLoadedMetadata = useCallback((video: HTMLVideoElement) => {
    if (Number.isFinite(video.duration)) setDuration(video.duration);
    video.volume = volume;
  }, [volume]);

  const handleDurationChange = useCallback((video: HTMLVideoElement) => {
    if (Number.isFinite(video.duration)) setDuration(video.duration);
  }, []);

  const handleTimeUpdate = useCallback((video: HTMLVideoElement) => {
    setCurrentTime(video.currentTime);
    refreshLiveInfo();
  }, [refreshLiveInfo]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  }, [videoRef]);

  return {
    playing,
    started,
    currentTime,
    duration,
    buffered,
    volume,
    muted,
    speed,
    loop,
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
    handlePlay,
    handlePause,
    handleLoadedMetadata,
    handleDurationChange,
    handleTimeUpdate,
    handleProgress,
  };
}
