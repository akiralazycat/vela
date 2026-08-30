import type { CSSProperties } from "react";
import type { VelaCaptionStyle, VelaTheme } from "./contracts";

export const DEFAULT_THEME: VelaTheme = {
  accent: "#d8ff62",
  surface: "#080908",
  foreground: "#ffffff",
  muted: "#a5a79f",
  radius: 0,
  blur: 18,
  controlsOpacity: 0.76,
};

export const DEFAULT_CAPTION_STYLE: VelaCaptionStyle = {
  fontScale: 1,
  color: "#ffffff",
  background: "#080908",
  backgroundOpacity: 0.82,
  edge: "shadow",
  fontFamily: "sans",
};

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(8, 9, 8, ${alpha})`;
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function createPlayerStyle(theme: VelaTheme, captionStyle: VelaCaptionStyle): CSSProperties {
  const captionEdge = captionStyle.edge === "outline"
    ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
    : captionStyle.edge === "shadow"
      ? "0 2px 5px rgba(0,0,0,.95)"
      : "none";

  const captionFont = captionStyle.fontFamily === "serif"
    ? 'Georgia, "Times New Roman", serif'
    : captionStyle.fontFamily === "mono"
      ? '"SFMono-Regular", Consolas, monospace'
      : "Arial, Helvetica, sans-serif";

  return {
    "--vela-accent": theme.accent,
    "--vela-surface": theme.surface,
    "--vela-foreground": theme.foreground,
    "--vela-muted": theme.muted,
    "--vela-radius": `${theme.radius}px`,
    "--vela-blur": `${theme.blur}px`,
    "--vela-controls-opacity": theme.controlsOpacity,
    "--vela-caption-scale": captionStyle.fontScale,
    "--vela-caption-color": captionStyle.color,
    "--vela-caption-bg": hexToRgba(captionStyle.background, captionStyle.backgroundOpacity),
    "--vela-caption-edge": captionEdge,
    "--vela-caption-font": captionFont,
  } as CSSProperties;
}
