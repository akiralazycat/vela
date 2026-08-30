"use client";

import { type ReactNode, useRef } from "react";
import type { VelaPlayerState } from "./core/contracts";
import { PlaybackSignals } from "./PlaybackSignals";
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
  const frameRef = useRef<HTMLDivElement>(null);

  return (
    <PlayerPresentationProvider
      displayMode={displayMode}
      playerState={playerState}
      setDisplayMode={onDisplayModeChange}
    >
      <div ref={frameRef} className="vela-display-frame" data-vela-display={displayMode}>
        {children}
        <PlaybackSignals frameRef={frameRef} playerState={playerState} />
        {showModeSwitch ? (
          <PlayerModeSwitch value={displayMode} onChange={onDisplayModeChange} />
        ) : null}
      </div>
    </PlayerPresentationProvider>
  );
}
