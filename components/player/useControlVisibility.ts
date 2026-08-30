"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ControlVisibilityOptions = {
  playing: boolean;
  settingsOpen: boolean;
  hideDelayMs?: number;
};

export function useControlVisibility({
  playing,
  settingsOpen,
  hideDelayMs = 2200,
}: ControlVisibilityOptions) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  const clearHideTimer = useCallback(() => {
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const showControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    if (playing && !settingsOpen) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), hideDelayMs);
    }
  }, [clearHideTimer, hideDelayMs, playing, settingsOpen]);

  const hideControls = useCallback(() => {
    if (playing && !settingsOpen) setControlsVisible(false);
  }, [playing, settingsOpen]);

  useEffect(() => {
    showControls();
    return clearHideTimer;
  }, [clearHideTimer, showControls]);

  return { controlsVisible, showControls, hideControls };
}
