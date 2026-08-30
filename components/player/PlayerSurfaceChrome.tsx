"use client";

import type { PlayerLoadStatus, VelaSourceType } from "./core/contracts";
import { formatTime } from "./core/utils";

type PlayerSurfaceChromeProps = {
  resolvedType: Exclude<VelaSourceType, "auto">;
  adaptive: boolean;
  isLive: boolean;
  status: PlayerLoadStatus;
  badges: readonly string[];
  gestureHint: string | null;
  errorMessage: string | null;
  started: boolean;
  duration: number;
  title: string;
  eyebrow: string;
  onPlay: () => void | Promise<void>;
};

function PlayIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M8 5.7a1 1 0 0 1 1.52-.85l9.1 5.95a1.43 1.43 0 0 1 0 2.4l-9.1 5.95A1 1 0 0 1 8 18.3V5.7Z" />
    </svg>
  );
}

export function PlayerSurfaceChrome({
  resolvedType,
  adaptive,
  isLive,
  status,
  badges,
  gestureHint,
  errorMessage,
  started,
  duration,
  title,
  eyebrow,
  onPlay,
}: PlayerSurfaceChromeProps) {
  return (
    <>
      <div className="vela-vignette" aria-hidden="true" />

      <div className="vela-engine-badge" aria-label={`${resolvedType} playback`}>
        <span className={`vela-status-dot is-${status}`} />
        {isLive ? "LIVE" : resolvedType.toUpperCase()}{adaptive && !isLive ? " / ABR" : ""}
      </div>

      {badges.length ? (
        <div className="vela-media-badges" aria-label="Media formats">
          {badges.map((badge) => <span key={badge}>{badge}</span>)}
        </div>
      ) : null}

      {gestureHint ? <div className="vela-gesture-hint" aria-live="polite">{gestureHint}</div> : null}

      {status === "error" ? (
        <div className="vela-error" role="alert">
          <small>STREAM ERROR</small>
          <strong>{errorMessage ?? "Unable to load video."}</strong>
        </div>
      ) : null}

      {!started && status !== "error" ? (
        <button className="vela-poster-action" type="button" onClick={() => void onPlay()} aria-label="Play video">
          <span className="vela-start-icon"><PlayIcon /></span>
          <span className="vela-start-copy">
            <small>{status === "loading" ? "PREPARING STREAM" : isLive ? "WATCH LIVE" : "PLAY FILM"}</small>
            <strong>{isLive ? "LIVE" : `00:00 — ${formatTime(duration)}`}</strong>
          </span>
        </button>
      ) : null}

      <div className="vela-title-block" aria-hidden="true">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
    </>
  );
}
