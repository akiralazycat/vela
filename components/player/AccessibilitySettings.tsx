"use client";

import type { CSSProperties } from "react";

export type AccessibilityCaptionStyle = {
  fontScale: number;
  backgroundOpacity: number;
  edge: "none" | "shadow" | "outline";
};

type AccessibilitySettingsProps = {
  captionStyle: AccessibilityCaptionStyle;
  style?: CSSProperties;
  onChange: (patch: Partial<AccessibilityCaptionStyle>) => void;
};

const CAPTION_SIZES = [0.8, 1, 1.2, 1.4] as const;
const CAPTION_EDGES = ["none", "shadow", "outline"] as const;
const CAPTION_BACKGROUNDS = [0, 0.5, 0.82] as const;

const PRESETS = {
  default: {
    label: "Default",
    patch: { fontScale: 1, edge: "shadow", backgroundOpacity: 0.82 } as const,
  },
  contrast: {
    label: "Contrast",
    patch: { fontScale: 1.2, edge: "outline", backgroundOpacity: 0.82 } as const,
  },
  large: {
    label: "Large",
    patch: { fontScale: 1.4, edge: "shadow", backgroundOpacity: 0.82 } as const,
  },
};

function titleCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

export function accessibilitySummary(style: AccessibilityCaptionStyle) {
  return `${Math.round(style.fontScale * 100)}% · ${titleCase(style.edge)}`;
}

function presetActive(style: AccessibilityCaptionStyle, patch: AccessibilityCaptionStyle) {
  return style.fontScale === patch.fontScale
    && style.edge === patch.edge
    && style.backgroundOpacity === patch.backgroundOpacity;
}

export function AccessibilitySettings({ captionStyle, style, onChange }: AccessibilitySettingsProps) {
  return (
    <section
      style={style}
      data-vela-accessibility-section="true"
      data-vela-accessibility-owner="react"
    >
      <span>SUBTITLE STYLE</span>

      <div className="vela-caption-preview-card" aria-hidden="true">
        <small>Caption preview</small>
        <div className="vela-caption-preview-line">Readable at a glance.</div>
      </div>

      <div className="vela-caption-presets">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            className={presetActive(captionStyle, preset.patch) ? "is-active" : ""}
            data-vela-caption-preset={key}
            aria-label={`Apply ${preset.label} caption style`}
            onClick={() => onChange(preset.patch)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="vela-setting-label">SIZE</div>
      <div className="vela-speed-grid">
        {CAPTION_SIZES.map((value) => (
          <button
            key={value}
            type="button"
            className={captionStyle.fontScale === value ? "selected" : ""}
            onClick={() => onChange({ fontScale: value })}
          >
            {Math.round(value * 100)}%
          </button>
        ))}
      </div>

      <div className="vela-setting-label">EDGE</div>
      <div className="vela-speed-grid">
        {CAPTION_EDGES.map((value) => (
          <button
            key={value}
            type="button"
            className={captionStyle.edge === value ? "selected" : ""}
            onClick={() => onChange({ edge: value })}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="vela-setting-label">BACKGROUND</div>
      <div className="vela-speed-grid">
        {CAPTION_BACKGROUNDS.map((value) => (
          <button
            key={value}
            type="button"
            className={captionStyle.backgroundOpacity === value ? "selected" : ""}
            onClick={() => onChange({ backgroundOpacity: value })}
          >
            {Math.round(value * 100)}%
          </button>
        ))}
      </div>
    </section>
  );
}
