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
import {
  audioDetail,
  audioId,
  detectSourceType,
  mediaBadges,
  sourceMime,
  type AdaptivePlayer,
  type AdaptiveTrack,
  type AudioOption,
  type QualityOption,
  type ShakaNamespace,
  type TextOption,
} from "./player/core/adaptive";
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
import { PlayerSurfaceChrome, type PlayerLoadStatus } from "./player/PlayerSurfaceChrome";
import { SettingsMenu } from "./player/SettingsMenu";
import { Timeline } from "./player/Timeline";
import { useControlVisibility } from "./player/useControlVisibility";
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
  const shakaRef = useRef<AdaptivePlayer | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const resolvedType = useMemo(() => detectSourceType(src, sourceType), [src, sourceType]);
  const adaptive = resolvedType === "hls" || resolvedType === "dash";
  const mergedTheme = useMemo(
    () => ({ ...DEFAULT_THEME, ...theme, accent: accent ?? theme?.accent ?? DEFAULT_THEME.accent }),
    [accent, theme],
  );
  const [captionStyleState, setCaptionStyleState] = useState<VelaCaptionStyle>({
    ...DEFAULT_CAPTION_STYLE,
    ...captionStyle,
  });

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
  const [speed, setSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loop, setLoop] = useState(false);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<"auto" | number>("auto");
  const [textOptions, setTextOptions] = useState<TextOption[]>([]);
  const [selectedText, setSelectedText] = useState<"off" | string>("off");
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [status, setStatus] = useState<PlayerLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedChapters, setResolvedChapters] = useState<VelaChapter[]>(chapters);
  const [isLive, setIsLive] = useState(false);
  const [seekWindow, setSeekWindow] = useState({ start: 0, end: 0 });
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);
  const [badges, setBadges] = useState<string[]>([]);

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
    setSeekWindow(player.seekRange());
    setLiveLatencyMs(player.getLiveLatency());
  }, []);

  useEffect(() => {
    const currentMedia = videoRef.current;
    if (!currentMedia) return;
    const media: HTMLVideoElement = currentMedia;
    let disposed = false;
    let instance: AdaptivePlayer | null = null;

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
    setBuffered(0);
    setIsLive(false);
    setSeekWindow({ start: 0, end: 0 });
    setLiveLatencyMs(null);
    setResolvedChapters(chapters);

    const listen = (type: string, listener: EventListener) => {
      instance?.addEventListener(type, listener);
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
            setSeekWindow(instance.seekRange());
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

  const { gestureHint, handlePointerDown, handlePointerUp } = usePlayerGestures({
    enabled: gestures,
    shellRef,
    playing,
    onTogglePlay: togglePlay,
    onSeekBy: seekBy,
    onShowControls: showControls,
  });

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

  const onSpeedChange = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
  }, []);

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

  const updateRuntime = (video: HTMLVideoElement) => {
    setCurrentTime(video.currentTime);
    const player = shakaRef.current;
    if (player?.isLive()) {
      setSeekWindow(player.seekRange());
      setLiveLatencyMs(player.getLiveLatency());
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
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
          onToggleLoop={() => setLoop((value) => !value)}
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
              onSpeedChange={onSpeedChange}
              onSelectText={selectTextTrack}
              onCaptionStyleChange={setCaptionStyle}
              onSeekChapter={seekTo}
              onToggleLoop={() => setLoop((value) => !value)}
            />
          ) : null}
        />
      </div>
    </div>
  );
});
