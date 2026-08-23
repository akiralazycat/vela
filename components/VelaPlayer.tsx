"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type VelaPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  eyebrow?: string;
  accent?: string;
  captionsSrc?: string;
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

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

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

export function VelaPlayer({
  src,
  poster,
  title = "Untitled",
  eyebrow = "VELA",
  accent = "#d8ff62",
  captionsSrc,
}: VelaPlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.82);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [preview, setPreview] = useState<{ x: number; time: number } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [loop, setLoop] = useState(false);
  const [captions, setCaptions] = useState(false);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0;
  const style = useMemo(() => ({ "--vela-accent": accent }) as CSSProperties, [accent]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const scheduleControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    if (playing) {
      hideTimerRef.current = setTimeout(() => {
        if (!speedOpen) setControlsVisible(false);
      }, 2200);
    }
  }, [clearHideTimer, playing, speedOpen]);

  useEffect(() => {
    scheduleControls();
    return clearHideTimer;
  }, [scheduleControls, clearHideTimer]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setStarted(true);
      await video.play();
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + amount, 0), video.duration || 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

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
      // Browsers may reject PiP while metadata is not ready or when policy blocks it.
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.textTracks.length === 0) return;
    const next = !captions;
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index].mode = next ? "showing" : "disabled";
    }
    setCaptions(next);
  }, [captions]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT") return;
    if ([" ", "k", "K"].includes(event.key)) {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "ArrowLeft") seekBy(-5);
    else if (event.key === "ArrowRight") seekBy(5);
    else if (["m", "M"].includes(event.key)) toggleMute();
    else if (["f", "F"].includes(event.key)) void toggleFullscreen();
    else if (["c", "C"].includes(event.key) && captionsSrc) toggleCaptions();
    else if (["l", "L"].includes(event.key)) setLoop((value) => !value);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.loop = loop;
  }, [loop]);

  const handleTimelineMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const time = ratio * duration;
    setPreview({ x: ratio * 100, time });
    const previewVideo = previewVideoRef.current;
    if (previewVideo && Number.isFinite(time) && Math.abs(previewVideo.currentTime - time) > 0.18) {
      previewVideo.currentTime = time;
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  };

  const onVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const onSpeedChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = value;
    setSpeed(value);
    setSpeedOpen(false);
    scheduleControls();
  };

  return (
    <div
      ref={shellRef}
      className={`vela-player ${controlsVisible ? "is-controls-visible" : ""} ${started ? "has-started" : ""}`}
      style={style}
      tabIndex={0}
      onPointerMove={scheduleControls}
      onPointerLeave={() => playing && setControlsVisible(false)}
      onFocus={scheduleControls}
      onKeyDown={handleKeyDown}
      aria-label={`${title} video player`}
    >
      <video
        ref={videoRef}
        className="vela-video"
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
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
        {captionsSrc ? <track kind="subtitles" src={captionsSrc} srcLang="en" label="English" /> : null}
      </video>

      <div className="vela-vignette" aria-hidden="true" />

      {!started ? (
        <button className="vela-poster-action" type="button" onClick={() => void togglePlay()} aria-label="Play video">
          <span className="vela-start-icon"><Icon name="play" /></span>
          <span className="vela-start-copy">
            <small>PLAY FILM</small>
            <strong>00:00 — {formatTime(duration)}</strong>
          </span>
        </button>
      ) : null}

      <div className="vela-title-block" aria-hidden="true">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>

      <div className="vela-controls" onPointerEnter={() => setControlsVisible(true)}>
        <div
          className="vela-timeline-wrap"
          onPointerMove={handleTimelineMove}
          onPointerLeave={() => setPreview(null)}
        >
          {preview ? (
            <div className="vela-preview" style={{ left: `${preview.x}%` }}>
              <video ref={previewVideoRef} src={src} muted playsInline preload="metadata" aria-hidden="true" />
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
            onChange={(event) => {
              const video = videoRef.current;
              if (video) video.currentTime = Number(event.target.value);
            }}
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
              <input
                className="vela-volume-input"
                type="range"
                min={0}
                max={1}
                step="0.01"
                value={muted ? 0 : volume}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                aria-label="Volume"
              />
            </div>

            <div className="vela-timecode" aria-label={`${formatTime(currentTime)} of ${formatTime(duration)}`}>
              <span>{formatTime(currentTime)}</span>
              <i>/</i>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="vela-control-group right">
            {captionsSrc ? (
              <button className={`vela-icon-button ${captions ? "is-active" : ""}`} type="button" onClick={toggleCaptions} aria-label="Toggle captions">
                <Icon name="captions" />
              </button>
            ) : null}

            <button className={`vela-icon-button ${loop ? "is-active" : ""}`} type="button" onClick={() => setLoop((value) => !value)} aria-label="Toggle loop">
              <Icon name="loop" />
            </button>

            <div className="vela-speed-menu">
              <button className={`vela-speed-button ${speedOpen ? "is-active" : ""}`} type="button" onClick={() => setSpeedOpen((value) => !value)} aria-expanded={speedOpen} aria-label="Playback speed">
                {speed === 1 ? "1×" : `${speed}×`}
              </button>
              {speedOpen ? (
                <div className="vela-popover" role="menu" aria-label="Playback speed options">
                  <span>SPEED</span>
                  {speeds.map((value) => (
                    <button key={value} type="button" onClick={() => onSpeedChange(value)} className={speed === value ? "selected" : ""} role="menuitem">
                      {value === 1 ? "Normal" : `${value}×`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button className="vela-icon-button desktop-only" type="button" onClick={() => void togglePip()} aria-label="Picture in picture">
              <Icon name="pip" />
            </button>
            <button className="vela-icon-button" type="button" onClick={() => void toggleFullscreen()} aria-label="Fullscreen">
              <Icon name="fullscreen" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
