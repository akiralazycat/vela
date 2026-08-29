"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { VelaPlayerState } from "../VelaPlayerCore";
import type { VelaDisplayMode } from "./presentation";

type PlayerPresentationContextValue = {
  displayMode: VelaDisplayMode;
  playerState: VelaPlayerState | null;
  setDisplayMode: (mode: VelaDisplayMode) => void;
};

const PlayerPresentationContext = createContext<PlayerPresentationContextValue | null>(null);

export function PlayerPresentationProvider({
  children,
  displayMode,
  playerState,
  setDisplayMode,
}: PlayerPresentationContextValue & { children: ReactNode }) {
  return (
    <PlayerPresentationContext.Provider value={{ displayMode, playerState, setDisplayMode }}>
      {children}
    </PlayerPresentationContext.Provider>
  );
}

export function usePlayerPresentation() {
  const value = useContext(PlayerPresentationContext);
  if (!value) throw new Error("usePlayerPresentation must be used inside PlayerPresentationProvider");
  return value;
}
