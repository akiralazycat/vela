"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ActionDock } from "./ActionDock";

type ControlDockProps = {
  playing: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLive: boolean;
  atLiveEdge: boolean;
  timelineEnd: number;
  currentChapterTitle?: string | null;
  hasTextTracks: boolean;
  captionsActive: boolean;
  loop: boolean;
  selectedQuality: "auto" | number;
  settingsOpen: boolean;
  settingsPanel?: ReactNode;
  onTogglePlay: () => void | Promise<void>;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onGoLive: () => void;
  onToggleCaptions: () => void;
  onToggleLoop: () => void;
  onToggleSettings: () => void;
  onPictureInPicture: () => void | Promise<void>;
  onFullscreen: () => void | Promise<void>;
};

type DockIconName = "play" | "pause" | "volume" | "muted" | "captions" | "loop" | "settings";
type CaptionDescriptor = { code: string; label: string };
type CaptionConfirmation = CaptionDescriptor & { active: boolean };

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

function captionDescriptor(button: HTMLButtonElement | null, active: boolean): CaptionDescriptor {
  if (!button || !active) return { code: "CC", label: "Subtitles" };
  const video = button.closest(".vela-player")?.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) return { code: "CC", label: "Subtitles" };

  let fallback: TextTrack | null = null;
  for (let index = 0; index < video.textTracks.length; index += 1) {
    const track = video.textTracks[index];
    fallback ??= track;
    if (track.mode !== "showing") continue;
    const language = track.language || "";
    return {
      code: language ? language.split("-")[0].toUpperCase() : "CC",
      label: track.label || language || "Subtitles",
    };
  }

  if (fallback) {
    const language = fallback.language || "";
    return {
      code: language ? language.split("-")[0].toUpperCase() : "CC",
      label: fallback.label || language || "Subtitles",
    };
  }
  return { code: "CC", label: "Subtitles" };
}

function DockIcon({ name }: { name: DockIconName }) {
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
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.91 2.91-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21h-4v-.08A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.91-2.91.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3v-4h.08A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.91-2.91.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.08V3h4v.08A1.65 1.65 0 0 0 15.4 4a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.91 2.91-.06.06A1.65 1.65 0 0 0 19.4 9c.37.22.7.55.92.92.22.38.36.8.4 1.24H21v4h-.08A1.65 1.65 0 0 0 19.4 15Z" /></svg>;
}

export function ControlDock({
  playing,
  muted,
  volume,
  currentTime,
  duration,
  isLive,
  atLiveEdge,
  timelineEnd,
  currentChapterTitle,
  hasTextTracks,
  captionsActive,
  loop,
  selectedQuality,
  settingsOpen,
  settingsPanel,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onGoLive,
  onToggleCaptions,
  onToggleLoop,
  onToggleSettings,
  onPictureInPicture,
  onFullscreen,
}: ControlDockProps) {
  const captionButtonRef = useRef<HTMLButtonElement>(null);
  const previousCaptionsActiveRef = useRef(captionsActive);
  const hideConfirmationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [captionInfo, setCaptionInfo] = useState<CaptionDescriptor>({ code: "CC", label: "Subtitles" });
  const [captionConfirmation, setCaptionConfirmation] = useState<CaptionConfirmation | null>(null);

  useEffect(() => {
    const button = captionButtonRef.current;
    if (!button) return;
    setPortalTarget(button.closest(".vela-player") as HTMLElement | null);
    const video = button.closest(".vela-player")?.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return;

    const sync = () => setCaptionInfo(captionDescriptor(button, captionsActive));
    sync();
    video.textTracks.addEventListener("change", sync);
    video.textTracks.addEventListener("addtrack", sync);
    video.textTracks.addEventListener("removetrack", sync);
    return () => {
      video.textTracks.removeEventListener("change", sync);
      video.textTracks.removeEventListener("addtrack", sync);
      video.textTracks.removeEventListener("removetrack", sync);
    };
  }, [captionsActive, hasTextTracks]);

  useEffect(() => {
    const previous = previousCaptionsActiveRef.current;
    previousCaptionsActiveRef.current = captionsActive;
    if (previous === captionsActive) return;

    const timer = setTimeout(() => {
      const info = captionDescriptor(captionButtonRef.current, captionsActive);
      setCaptionInfo(info);
      setCaptionConfirmation({ ...info, active: captionsActive });
      if (hideConfirmationRef.current) clearTimeout(hideConfirmationRef.current);
      hideConfirmationRef.current = setTimeout(() => setCaptionConfirmation(null), 1650);
    }, 0);
    return () => clearTimeout(timer);
  }, [captionsActive]);

  useEffect(() => () => {
    if (hideConfirmationRef.current) clearTimeout(hideConfirmationRef.current);
  }, []);

  return (
    <>
      <div className="vela-control-row" data-vela-control-dock-owner="react">
        <div className="vela-control-group">
          <button className="vela-icon-button primary" type="button" onClick={() => void onTogglePlay()} aria-label={playing ? "Pause" : "Play"}>
            <DockIcon name={playing ? "pause" : "play"} />
          </button>

          <div className="vela-volume-cluster">
            <button className="vela-icon-button" type="button" onClick={onToggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              <DockIcon name={muted || volume === 0 ? "muted" : "volume"} />
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

          {isLive ? (
            <button className={`vela-live-button ${atLiveEdge ? "is-live-edge" : ""}`} type="button" onClick={onGoLive}>
              <span />
              {atLiveEdge ? "LIVE" : `GO LIVE · -${formatTime(Math.max(timelineEnd - currentTime, 0))}`}
            </button>
          ) : (
            <div className="vela-timecode" aria-label={`${formatTime(currentTime)} of ${formatTime(duration)}`}>
              <span>{formatTime(currentTime)}</span><i>/</i><span>{formatTime(duration)}</span>
            </div>
          )}

          {currentChapterTitle ? <span className="vela-current-chapter">{currentChapterTitle}</span> : null}
        </div>

        <div className="vela-control-group right">
          {hasTextTracks ? (
            <button
              ref={captionButtonRef}
              className={`vela-icon-button ${captionsActive ? "is-active" : ""}`}
              type="button"
              onClick={onToggleCaptions}
              aria-label={captionsActive ? `${captionInfo.label} on. Toggle subtitles off.` : "Subtitles off. Toggle subtitles on."}
              data-vela-caption-control="true"
              data-vela-caption-state={captionsActive ? "on" : "off"}
              data-vela-caption-code={captionsActive ? captionInfo.code : undefined}
            >
              <DockIcon name="captions" />
            </button>
          ) : null}

          {!isLive ? (
            <button className={`vela-icon-button ${loop ? "is-active" : ""}`} type="button" onClick={onToggleLoop} aria-label="Toggle loop">
              <DockIcon name="loop" />
            </button>
          ) : null}

          <div className="vela-settings-menu">
            <button
              className={`vela-settings-button ${settingsOpen ? "is-active" : ""}`}
              type="button"
              onClick={onToggleSettings}
              aria-expanded={settingsOpen}
              aria-label="Playback settings"
            >
              <span>{selectedQuality === "auto" ? "AUTO" : `${selectedQuality}P`}</span>
              <DockIcon name="settings" />
            </button>
            {settingsPanel}
          </div>

          <ActionDock onPictureInPicture={onPictureInPicture} onFullscreen={onFullscreen} />
        </div>
      </div>

      {portalTarget && captionConfirmation ? createPortal(
        <div className="vela-subtitle-confirmation is-visible" role="status" aria-live="polite">
          <small>SUBTITLES</small>
          <strong>{captionConfirmation.active ? captionConfirmation.label : "Off"}</strong>
          <span>{captionConfirmation.active ? `${captionConfirmation.code} · Subtitles` : "Captions hidden"}</span>
        </div>,
        portalTarget,
      ) : null}
    </>
  );
}
