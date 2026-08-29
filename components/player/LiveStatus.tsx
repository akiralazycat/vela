"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LiveStatusProps = {
  atLiveEdge: boolean;
  currentTime: number;
  timelineEnd: number;
  onGoLive: () => void;
};

function formatOffset(seconds: number, precise = false) {
  const safe = Math.max(0, seconds);
  if (precise && safe < 10) return `${safe.toFixed(1)}s`;
  const total = Math.round(safe);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function LiveStatus({ atLiveEdge, currentTime, timelineEnd, onGoLive }: LiveStatusProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pendingReturnRef = useRef(false);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const delay = Math.max(timelineEnd - currentTime, 0);
  const label = atLiveEdge
    ? `LIVE · ${formatOffset(delay, true).toUpperCase()}`
    : `GO LIVE · −${formatOffset(delay)}`;

  useEffect(() => {
    setPortalTarget(buttonRef.current?.closest(".vela-player") as HTMLElement | null);
  }, []);

  useEffect(() => {
    if (!pendingReturnRef.current || !atLiveEdge) return;
    pendingReturnRef.current = false;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowConfirmation(true);
    hideTimerRef.current = setTimeout(() => setShowConfirmation(false), 1500);
  }, [atLiveEdge]);

  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const goLive = () => {
    if (!atLiveEdge) {
      pendingReturnRef.current = true;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        pendingReturnRef.current = false;
        pendingTimerRef.current = null;
      }, 4000);
    }
    onGoLive();
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={`vela-live-button ${atLiveEdge ? "is-live-edge" : ""}`}
        type="button"
        onClick={goLive}
        aria-label={atLiveEdge
          ? `At live edge, ${formatOffset(delay, true)} behind edge`
          : `Return to live edge, ${formatOffset(delay)} behind`}
        data-vela-live-enhanced="true"
        data-vela-live-state={atLiveEdge ? "edge" : "behind"}
        data-vela-live-label={label}
        data-vela-live-owner="react"
      >
        <span />
        {label}
      </button>

      {portalTarget && showConfirmation ? createPortal(
        <div className="vela-live-confirmation is-visible" role="status" aria-live="polite">
          <small>LIVE</small>
          <strong>Back at live edge</strong>
          <span>Live playback restored</span>
        </div>,
        portalTarget,
      ) : null}
    </>
  );
}
