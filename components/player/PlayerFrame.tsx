"use client";

import type { ReactNode } from "react";
import type { VelaPlayerState } from "../VelaPlayerCore";
import { PlayerModeSwitch } from "./PlayerModeSwitch";
import { PlayerPresentationProvider } from "./PlayerPresentationContext";
import type { VelaDisplayMode } from "./presentation";

type PlayerFrameProps = {
  children: ReactNode;
  displayMode: VelaDisplayMode;
  playerState: VelaPlayerState | null;
  showModeSwitch: boolean;
  onDisplayModeChange: (mode: VelaDisplayMode) => void;
};

export function PlayerFrame({
  children,
  displayMode,
  playerState,
  showModeSwitch,
  onDisplayModeChange,
}: PlayerFrameProps) {
  return (
    <PlayerPresentationProvider
      displayMode={displayMode}
      playerState={playerState}
      setDisplayMode={onDisplayModeChange}
    >
      <div className="vela-display-frame" data-vela-display={displayMode}>
        {children}
        {showModeSwitch ? (
          <PlayerModeSwitch value={displayMode} onChange={onDisplayModeChange} />
        ) : null}
      </div>
    </PlayerPresentationProvider>
  );
}
