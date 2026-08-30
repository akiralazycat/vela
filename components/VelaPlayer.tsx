"use client";

import { forwardRef, useCallback, useState } from "react";
import { VelaPlayerCore } from "./VelaPlayerCore";
import type {
  VelaCaptionStyle,
  VelaChapter,
  VelaPlayerHandle,
  VelaPlayerProps as VelaPlayerCoreProps,
  VelaPlayerState,
  VelaSourceType,
  VelaTextTrack,
  VelaTheme,
} from "./player/core/contracts";
import { PlayerFrame } from "./player/PlayerFrame";
import type { VelaDisplayMode } from "./player/presentation";

export type {
  VelaCaptionStyle,
  VelaChapter,
  VelaPlayerHandle,
  VelaPlayerState,
  VelaSourceType,
  VelaTextTrack,
  VelaTheme,
  VelaDisplayMode,
};

export type VelaPlayerProps = VelaPlayerCoreProps & {
  /** Presentation preset. Controlled when supplied. */
  displayMode?: VelaDisplayMode;
  /** Initial presentation preset for uncontrolled use. */
  defaultDisplayMode?: VelaDisplayMode;
  /** Optional segmented switch, primarily useful for demos and editors. */
  showDisplayModeSwitch?: boolean;
  onDisplayModeChange?: (mode: VelaDisplayMode) => void;
};

export const VelaPlayer = forwardRef<VelaPlayerHandle, VelaPlayerProps>(function VelaPlayer(
  {
    displayMode,
    defaultDisplayMode = "default",
    showDisplayModeSwitch = false,
    onDisplayModeChange,
    onStateChange,
    ...coreProps
  },
  ref,
) {
  const [internalDisplayMode, setInternalDisplayMode] = useState<VelaDisplayMode>(defaultDisplayMode);
  const [playerState, setPlayerState] = useState<VelaPlayerState | null>(null);
  const resolvedDisplayMode = displayMode ?? internalDisplayMode;

  const setDisplayMode = useCallback((mode: VelaDisplayMode) => {
    if (displayMode === undefined) setInternalDisplayMode(mode);
    onDisplayModeChange?.(mode);
  }, [displayMode, onDisplayModeChange]);

  const handleStateChange = useCallback((state: VelaPlayerState) => {
    setPlayerState(state);
    onStateChange?.(state);
  }, [onStateChange]);

  return (
    <PlayerFrame
      displayMode={resolvedDisplayMode}
      playerState={playerState}
      showModeSwitch={showDisplayModeSwitch}
      onDisplayModeChange={setDisplayMode}
    >
      <VelaPlayerCore
        {...coreProps}
        ref={ref}
        onStateChange={handleStateChange}
      />
    </PlayerFrame>
  );
});
