"use client";

import { useMemo, useState } from "react";
import { VelaPlayer, type VelaTextTrack, type VelaTheme } from "@/components/VelaPlayer";

const sources = {
  dash: "https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd",
  hls: "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",
} as const;

const extraTracks: VelaTextTrack[] = [
  { src: "/demo-en.vtt", language: "en", label: "Vela English", kind: "subtitles" },
  { src: "/demo-ja.vtt", language: "ja", label: "Vela 日本語", kind: "subtitles" },
];

const initialTheme: VelaTheme = {
  accent: "#d8ff62",
  surface: "#080908",
  foreground: "#ffffff",
  muted: "#a5a79f",
  radius: 0,
  blur: 18,
  controlsOpacity: 0.76,
};

export function VelaStudio() {
  const [protocol, setProtocol] = useState<keyof typeof sources>("dash");
  const [theme, setTheme] = useState(initialTheme);
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => JSON.stringify({
    src: sources[protocol],
    sourceType: protocol,
    thumbnailVtt: "/demo-thumbnails.vtt",
    textTracks: extraTracks,
    theme,
  }, null, 2), [protocol, theme]);

  function patchTheme<K extends keyof VelaTheme>(key: K, value: VelaTheme[K]) {
    setTheme((current) => ({ ...current, [key]: value }));
  }

  const copyConfig = async () => {
    await navigator.clipboard?.writeText(config);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="vela-studio">
      <div className="studio-toolbar">
        <div className="studio-protocol-switch" aria-label="Streaming protocol">
          {(["dash", "hls"] as const).map((item) => (
            <button key={item} type="button" className={protocol === item ? "is-active" : ""} onClick={() => setProtocol(item)}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <span>ADAPTIVE / MULTI-TRACK / SPRITE PREVIEW</span>
      </div>

      <VelaPlayer
        key={protocol}
        title="Angel One / Adaptive"
        eyebrow="VELA STREAM"
        src={sources[protocol]}
        sourceType={protocol}
        poster="/vela-poster.svg"
        textTracks={extraTracks}
        thumbnailVtt="/demo-thumbnails.vtt"
        theme={theme}
      />

      <div className="stage-meta" aria-label="Demo details">
        <span>HLS + MPEG-DASH</span>
        <span>AUTO / FIXED QUALITY</span>
        <span>WEBVTT SPRITE</span>
      </div>

      <div className="theme-lab">
        <div className="theme-lab-heading">
          <div>
            <p className="eyebrow">Theme builder</p>
            <h2>Make the player belong.</h2>
          </div>
          <button type="button" className="copy-config" onClick={() => void copyConfig()}>{copied ? "COPIED" : "COPY CONFIG"}</button>
        </div>

        <div className="theme-controls">
          <label>
            <span>Accent</span>
            <input type="color" value={theme.accent} onChange={(event) => patchTheme("accent", event.target.value)} />
            <code>{theme.accent}</code>
          </label>
          <label>
            <span>Surface</span>
            <input type="color" value={theme.surface} onChange={(event) => patchTheme("surface", event.target.value)} />
            <code>{theme.surface}</code>
          </label>
          <label>
            <span>Corner radius</span>
            <input type="range" min="0" max="28" step="1" value={theme.radius} onChange={(event) => patchTheme("radius", Number(event.target.value))} />
            <code>{theme.radius}px</code>
          </label>
          <label>
            <span>Control blur</span>
            <input type="range" min="0" max="36" step="1" value={theme.blur} onChange={(event) => patchTheme("blur", Number(event.target.value))} />
            <code>{theme.blur}px</code>
          </label>
          <label>
            <span>Control density</span>
            <input type="range" min="0.45" max="0.98" step="0.01" value={theme.controlsOpacity} onChange={(event) => patchTheme("controlsOpacity", Number(event.target.value))} />
            <code>{Math.round(theme.controlsOpacity * 100)}%</code>
          </label>
        </div>

        <pre className="theme-config" aria-label="Vela configuration"><code>{config}</code></pre>
      </div>
    </div>
  );
}
