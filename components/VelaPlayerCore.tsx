"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
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
  VelaTextTrack,
} from "./player/core/contracts";
import {
  createPlayerStyle,
  DEFAULT_CAPTION_STYLE,
  DEFAULT_THEME,
} from "./player/core/playerStyle";
import { PlayerSurfaceChrome } from "./player/PlayerSurfaceChrome";
import { SettingsMenu } from "./player/SettingsMenu";
import { Timeline } from "./player/Timeline";
import { useControlVisibility } from "./player/useControlVisibility";
import { useMediaControls } from "./player/useMediaControls";
import { usePlaybackEngine } from "./player/usePlaybackEngine";
import { usePlayerController } from "./player/usePlayerController";
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
    handleVolumeChange,
    handleRateChange,
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

  const style = useMemo(
    () => createPlayerStyle(mergedTheme, captionStyleState),
    [captionStyleState, mergedTheme],
  );

  const setCaptionStyle = useCallback((patch: Partial<VelaCaptionStyle>) => {
    setCaptionStyleState((current) => ({ ...current, ...patch }));
  }, []);

  const {
    currentChapter,
    toggleCaptions,
    toggleFullscreen,
    togglePip,
    handleKeyDown,
  } = usePlayerController({
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
    chapters: resolvedChapters,
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
  });

  const { gestureHint, handlePointerDown, handlePointerUp } = usePlayerGestures({
    enabled: gestures,
    shellRef,
    playing,
    onTogglePlay: togglePlay,
    onSeekBy: seekBy,
    onShowControls: showControls,
  });

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
        crossOrigin={adaptive ? "anonymous" : undefined}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePause}
        onLoadedMetadata={(event) => handleLoadedMetadata(event.currentTarget)}
        onDurationChange={(event) => handleDurationChange(event.currentTarget)}
        onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)}
        onProgress={handleProgress}
        onVolumeChange={(event) => handleVolumeChange(event.currentTarget)}
        onRateChange={(event) => handleRateChange(event.currentTarget)}
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
