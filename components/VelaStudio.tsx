"use client";

import { useMemo, useState } from "react";
import {
  VelaPlayer,
  type VelaCaptionStyle,
  type VelaChapter,
  type VelaTextTrack,
  type VelaTheme,
} from "@/components/VelaPlayer";

const sources = {
  dash: {
    src: "https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd",
    type: "dash" as const,
    title: "Angel One / DASH",
  },
  hls: {
    src: "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",
    type: "hls" as const,
    title: "Angel One / HLS",
  },
  live: {
    src: "https://storage.googleapis.com/shaka-live-assets/player-source.mpd",
    type: "dash" as const,
    title: "Shaka History / Live",
  },
};

const extraTracks: VelaTextTrack[] = [
  { src: "/demo-en.vtt", language: "en", label: "Vela English", kind: "subtitles" },
  { src: "/demo-ja.vtt", language: "ja", label: "Vela 日本語", kind: "subtitles" },
];

const demoChapters: VelaChapter[] = [
  { id: "opening", title: "Opening", start: 0, end: 12 },
  { id: "crossing", title: "The crossing", start: 12, end: 24 },
  { id: "horizon", title: "Horizon", start: 24 },
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

const initialCaptionStyle: VelaCaptionStyle = {
  fontScale: 1,
  color: "#ffffff",
  background: "#080908",
  backgroundOpacity: 0.82,
  edge: "shadow",
  fontFamily: "sans",
};

type DisplayMode = "default" | "minimal";

export function VelaStudio() {
  const [mode, setMode] = useState<keyof typeof sources>("dash");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("default");
  const [theme, setTheme] = useState(initialTheme);
  const [captionStyle, setCaptionStyle] = useState(initialCaptionStyle);
  const [copied, setCopied] = useState(false);
  const source = sources[mode];

  const config = useMemo(() => JSON.stringify({
    src: source.src,
    sourceType: source.type,
    thumbnailVtt: mode === "live" ? undefined : "/demo-thumbnails.vtt",
    textTracks: mode === "live" ? [] : extraTracks,
    chapters: mode === "live" ? [] : demoChapters,
    captionStyle,
    theme,
  }, null, 2), [captionStyle, mode, source, theme]);

  function patchTheme<K extends keyof VelaTheme>(key: K, value: VelaTheme[K]) {
    setTheme((current) => ({ ...current, [key]: value }));
  }

  function patchCaption<K extends keyof VelaCaptionStyle>(key: K, value: VelaCaptionStyle[K]) {
    setCaptionStyle((current) => ({ ...current, [key]: value }));
  }

  const copyConfig = async () => {
    await navigator.clipboard?.writeText(config);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="vela-studio">
      <div className="studio-toolbar">
        <div className="studio-protocol-switch" aria-label="Playback mode">
          {(["dash", "hls", "live"] as const).map((item) => (
            <button key={item} type="button" className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
        <span>AUDIO / CHAPTERS / LIVE DVR / HDR SIGNALS</span>
      </div>

      <div className="vela-display-frame" data-vela-display={displayMode}>
        <VelaPlayer
          key={mode}
          title={source.title}
          eyebrow={mode === "live" ? "VELA LIVE" : "VELA STREAM"}
          src={source.src}
          sourceType={source.type}
          poster={mode === "live" ? undefined : "/vela-poster.svg"}
          textTracks={mode === "live" ? undefined : extraTracks}
          thumbnailVtt={mode === "live" ? undefined : "/demo-thumbnails.vtt"}
          chapters={mode === "live" ? undefined : demoChapters}
          captionStyle={captionStyle}
          theme={theme}
        />

        <div className="vela-display-switch-row">
          <div className="vela-display-switch" role="group" aria-label="Player display mode">
            {(["default", "minimal"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={displayMode === item ? "is-active" : ""}
                aria-pressed={displayMode === item}
                onClick={() => setDisplayMode(item)}
              >
                {item === "default" ? "Default" : "Minimal"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stage-meta" aria-label="Demo details">
        <span>MULTILINGUAL AUDIO</span>
        <span>CHAPTER + DVR TIMELINE</span>
        <span>HDR / DOLBY METADATA</span>
      </div>

      <div className="theme-lab">
        <div className="theme-lab-heading">
          <div>
            <p className="eyebrow">Theme + caption builder</p>
            <h2>Design the entire surface.</h2>
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
            <span>Caption color</span>
            <input type="color" value={captionStyle.color} onChange={(event) => patchCaption("color", event.target.value)} />
            <code>{captionStyle.color}</code>
          </label>
          <label>
            <span>Caption size</span>
            <input type="range" min="0.8" max="1.5" step="0.1" value={captionStyle.fontScale} onChange={(event) => patchCaption("fontScale", Number(event.target.value))} />
            <code>{Math.round(captionStyle.fontScale * 100)}%</code>
          </label>
          <label>
            <span>Caption background</span>
            <input type="range" min="0" max="1" step="0.05" value={captionStyle.backgroundOpacity} onChange={(event) => patchCaption("backgroundOpacity", Number(event.target.value))} />
            <code>{Math.round(captionStyle.backgroundOpacity * 100)}%</code>
          </label>
          <label>
            <span>Caption edge</span>
            <select value={captionStyle.edge} onChange={(event) => patchCaption("edge", event.target.value as VelaCaptionStyle["edge"])}>
              <option value="none">None</option>
              <option value="shadow">Shadow</option>
              <option value="outline">Outline</option>
            </select>
            <code>{captionStyle.edge}</code>
          </label>
        </div>

        <pre className="theme-config" aria-label="Vela configuration"><code>{config}</code></pre>
      </div>
    </div>
  );
}
