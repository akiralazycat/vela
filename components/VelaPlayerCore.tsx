"use client";

import {
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ControlDock } from "./player/ControlDock";
import type {
  VelaCaptionStyle,
  VelaChapter,
  VelaPlayerHandle,
  VelaPlayerProps,
  VelaPlayerState,
  VelaTextTrack,
} from "./player/core/contracts";
import {
  createPlayerStyle,
  DEFAULT_CAPTION_STYLE,
  DEFAULT_THEME,
} from "./player/core/playerStyle";
import { clamp } from "./player/core/utils";
import { PlayerSurfaceChrome } from "./player/PlayerSurfaceChrome";
import { SettingsMenu } from "./player/SettingsMenu";
import { Timeline } from "./player/Timeline";
import { useControlVisibility } from "./player/useControlVisibility";
import { useMediaControls } from "./player/useMediaControls";
import { usePlaybackEngine } from "./player/usePlaybackEngine";
import { usePlayerGestures } from "./player/usePlayerGestures";

const EMPTY_TEXT_TRACKS: VelaTextTrack[] = [];
const EMPTY_CHAPTERS: VelaChapter[] = [];

export const VelaPlayerCore = forwardRef<VelaPlayerHandle, VelaPlayerProps>(function VelaPlayerCore(
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
  const mergedTheme = useMemo(
    () => ({ ...DEFAULT_THEME, ...theme, accent: accent ?? theme?.accent ?? DEFAULT_THEME.accent }),
    [accent, theme],
  );
  const [captionStyleState, setCaptionStyleState] = useState<VelaCaptionStyle>({
    ...DEFAULT_CAPTION_STYLE,
    ...captionStyle,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setCaptionStyleState((current) => ({ ...current, ...captionStyle }));
  }, [captionStyle]);

  const {
    adaptivePlayerRef,
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
    refreshLiveInfo,
  } = usePlaybackEngine({
    videoRef,
    src,
    sourceType,
    captionsSrc,
    textTracks,
    chapters,
    chapterLanguage,
    autoPlay,
    onReady,
  });

  const {
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
  } = useMediaControls({
    videoRef,
    adaptivePlayerRef,
    isLive,
    status,
    refreshLiveInfo,
    sessionKey,
  });

  const { controlsVisible, showControls, hideControls } = useControlVisibility({ playing, settingsOpen });
  const timelineStart = isLive ? seekWindow.start : 0;
  const timelineEnd = isLive ? seekWindow.end : duration;
  const timelineSpan = Math.max(timelineEnd - timelineStart, 0);
  const atLiveEdge = isLive ? seekWindow.end - currentTime <= 2.5 : false;

  const currentChapter = useMemo(() => {
    return resolvedChapters.find((chapter, index) => {
      const end = chapter.end ?? resolvedChapters[index + 1]?.start ?? timelineEnd;
      return currentTime >= chapter.start && currentTime < end;
    }) ?? null;
  }, [currentTime, resolvedChapters, timelineEnd]);

  const style = useMemo(
    () => createPlayerStyle(mergedTheme, captionStyleState),
    [captionStyleState, mergedTheme],
  );

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

  const { gestureHint, handlePointerDown, handlePointerUp } = usePlayerGestures({
    enabled: gestures,
    shellRef,
    playing,
    onTogglePlay: togglePlay,
    onSeekBy: seekBy,
    onShowControls: showControls,
  });

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
    else if (key === "l" && event.shiftKey) toggleLoop();
    else if (key === "l") seekBy(10);
    else if (key === "m") toggleMute();
    else if (key === "f") void toggleFullscreen();
    else if (key === "c") toggleCaptions();
    else if (key === "home") seekTo(timelineStart);
    else if (key === "end") isLive ? goLive() : seekTo(timelineEnd);
    else if (event.key === ">") setPlaybackRate(Math.min(2, speed + 0.25));
    else if (event.key === "<") setPlaybackRate(Math.max(0.5, speed - 0.25));
  };

  return (
    <div
      ref={shellRef}
      className={`vela-player ${controlsVisible ? "is-controls-visible" : ""} ${started ? "has-started" : ""} ${isLive ? "is-live" : ""}`}
      style={style}
      tabIndex={0}
      onPointerMove={showControls}
      onPointerLeave={hideControls}
      onFocus={showControls}
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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePause}
        onLoadedMetadata={(event) => handleLoadedMetadata(event.currentTarget)}
        onDurationChange={(event) => handleDurationChange(event.currentTarget)}
        onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)}
        onProgress={handleProgress}
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

      <PlayerSurfaceChrome
        resolvedType={resolvedType}
        adaptive={adaptive}
        isLive={isLive}
        status={status}
        badges={badges}
        gestureHint={gestureHint}
        errorMessage={errorMessage}
        started={started}
        duration={duration}
        title={title}
        eyebrow={eyebrow}
        onPlay={togglePlay}
      />

      <div className="vela-controls" onPointerEnter={showControls}>
        <Timeline
          currentTime={currentTime}
          buffered={buffered}
          duration={duration}
          isLive={isLive}
          seekWindow={seekWindow}
          chapters={resolvedChapters}
          thumbnailVtt={thumbnailVtt}
          onSeek={seekTo}
        />

        <ControlDock
          playing={playing}
          muted={muted}
          volume={volume}
          currentTime={currentTime}
          duration={duration}
          isLive={isLive}
          atLiveEdge={atLiveEdge}
          timelineEnd={timelineEnd}
          currentChapterTitle={currentChapter?.title}
          hasTextTracks={textOptions.length > 0}
          captionsActive={selectedText !== "off"}
          loop={loop}
          selectedQuality={selectedQuality}
          settingsOpen={settingsOpen}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onVolumeChange={setVolume}
          onGoLive={goLive}
          onToggleCaptions={toggleCaptions}
          onToggleLoop={toggleLoop}
          onToggleSettings={() => setSettingsOpen((value) => !value)}
          onPictureInPicture={togglePip}
          onFullscreen={toggleFullscreen}
          settingsPanel={settingsOpen ? (
            <SettingsMenu
              isLive={isLive}
              loop={loop}
              selectedQuality={selectedQuality}
              qualities={qualities}
              speed={speed}
              audioOptions={audioOptions}
              selectedAudio={selectedAudio}
              textOptions={textOptions}
              selectedText={selectedText}
              captionStyle={captionStyleState}
              chapters={resolvedChapters}
              currentChapterStart={currentChapter?.start ?? null}
              onSelectAudio={selectAudioTrack}
              onSelectQuality={selectQuality}
              onSpeedChange={setPlaybackRate}
              onSelectText={selectTextTrack}
              onCaptionStyleChange={setCaptionStyle}
              onSeekChapter={seekTo}
              onToggleLoop={toggleLoop}
            />
          ) : null}
        />
      </div>
    </div>
  );
});
