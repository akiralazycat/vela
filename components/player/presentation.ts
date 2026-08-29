import type { VelaPlayerState } from "../VelaPlayerCore";

export type VelaDisplayMode = "default" | "minimal";

export type VelaPresentationSnapshot = {
  displayMode: VelaDisplayMode;
  playerState: VelaPlayerState | null;
};
