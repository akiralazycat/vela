import type { VelaPlayerState } from "./core/contracts";

export type VelaDisplayMode = "default" | "minimal";

export type VelaPresentationSnapshot = {
  displayMode: VelaDisplayMode;
  playerState: VelaPlayerState | null;
};
