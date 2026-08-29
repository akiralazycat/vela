"use client";

import { memo, type CSSProperties, useEffect, useRef, useState } from "react";

type SettingsView =
  | "root"
  | "more"
  | "quality"
  | "speed"
  | "audio"
  | "subtitles"
  | "accessibility"
  | "chapters"
  | "controls";

type SettingsQualityOption = {
  height: number;
  bandwidth: number;
};

type SettingsAudioOption = {
  id: string;
  label: string;
  language: string;
  detail: string;
};

type SettingsTextOption = {
  id: string;
  label: string;
  language: string;
};

type SettingsChapter = {
  id?: string;
  title: string;
  start: number;
  end?: number;
};

type SettingsCaptionStyle = {
  fontScale: number;
  backgroundOpacity: number;
  edge: "none" | "shadow" | "outline";
};

type SettingsMenuProps = {
  isLive: boolean;
  loop: boolean;
  selectedQuality: "auto" | number;
  qualities: ReadonlyArray<SettingsQualityOption>;
  speed: number;
  audioOptions: ReadonlyArray<SettingsAudioOption>;
  selectedAudio: string | null;
  textOptions: ReadonlyArray<SettingsTextOption>;
  selectedText: "off" | string;
  captionStyle: SettingsCaptionStyle;
  chapters: ReadonlyArray<SettingsChapter>;
  currentChapterStart?: number | null;
  onSelectAudio: (id: string) => void;
  onSelectQuality: (quality: "auto" | number) => void;
  onSpeedChange: (value: number) => void;
  onSelectText: (id: "off" | string) => void;
  onCaptionStyleChange: (patch: Partial<SettingsCaptionStyle>) => void;
  onSeekChapter: (time: number) => void;
  onToggleLoop: () => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const CAPTION_SIZES = [0.8, 1, 1.2, 1.4] as const;
const CAPTION_EDGES = ["none", "shadow", "outline"] as const;
const CAPTION_BACKGROUNDS = [0, 0.5, 0.82] as const;

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function titleCase(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function NavRow({
  label,
  value,
  onClick,
  arrow = true,
}: {
  label: string;
  value?: string;
  onClick: () => void;
  arrow?: boolean;
}) {
  return (
    <button className={`vela-settings-nav-row ${arrow ? "" : "vela-settings-nav-action"}`} type="button" onClick={onClick}>
      <span className="vela-settings-nav-label">{label}</span>
      {arrow ? (
        <span className="vela-settings-nav-trailing">
          {value ? <span className="vela-settings-nav-value">{value}</span> : null}
          <span className="vela-settings-nav-arrow" aria-hidden="true">›</span>
        </span>
      ) : (
        <span className="vela-settings-nav-value">{value}</span>
      )}
    </button>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="vela-settings-layer-header">
      <button className="vela-settings-back" type="button" aria-label="Back" onClick={onBack}>‹</button>
      <strong>{title}</strong>
    </div>
  );
}

function SettingsMenuImpl({
  isLive,
  loop,
  selectedQuality,
  qualities,
  speed,
  audioOptions,
  selectedAudio,
  textOptions,
  selectedText,
  captionStyle,
  chapters,
  currentChapterStart,
  onSelectAudio,
  onSelectQuality,
  onSpeedChange,
  onSelectText,
  onCaptionStyleChange,
  onSeekChapter,
  onToggleLoop,
}: SettingsMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<SettingsView>("root");
  const [decodedHeight, setDecodedHeight] = useState(0);

  useEffect(() => {
    const video = popoverRef.current?.closest(".vela-player")?.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return;

    const sync = () => setDecodedHeight((current) => video.videoHeight || current);
    sync();
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("resize", sync);
    return () => {
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("resize", sync);
    };
  }, []);

  const selectedAudioOption = audioOptions.find((option) => option.id === selectedAudio);
  const selectedTextOption = textOptions.find((option) => option.id === selectedText);
  const selectedChapter = chapters.find((chapter) => chapter.start === currentChapterStart);
  const qualityValue = selectedQuality === "auto"
    ? decodedHeight ? `Auto · ${decodedHeight}p` : "Auto"
    : `${selectedQuality}p`;
  const subtitleValue = selectedText === "off" ? "Off" : selectedTextOption?.label || "On";
  const accessibilityValue = `${Math.round(captionStyle.fontScale * 100)}% · ${titleCase(captionStyle.edge)}`;

  const sectionStyle = (section: SettingsView): CSSProperties => ({
    display: view === section ? "grid" : "none",
  });

  const detailHeader = view !== "root" && view !== "more" ? (
    <Header
      title={view === "accessibility" ? "Accessibility" : titleCase(view)}
      onBack={() => setView(view === "quality" || view === "speed" ? "root" : "more")}
    />
  ) : null;

  return (
    <div
      ref={popoverRef}
      className="vela-popover vela-settings-popover"
      role="dialog"
      aria-label="Playback settings"
      data-vela-layered="true"
      data-vela-settings-view={view}
      data-vela-settings-owner="react"
    >
      <div className="vela-settings-layer">
        {view === "root" ? (
          <div className="vela-settings-nav-list">
            {qualities.length ? <NavRow label="Quality" value={qualityValue} onClick={() => setView("quality")} /> : null}
            {!isLive ? <NavRow label="Speed" value={`${speed}×`} onClick={() => setView("speed")} /> : null}
            <NavRow label="More settings" onClick={() => setView("more")} />
          </div>
        ) : null}

        {view === "more" ? (
          <>
            <Header title="More settings" onBack={() => setView("root")} />
            <div className="vela-settings-nav-list vela-settings-nav-list-secondary">
              {audioOptions.length ? <NavRow label="Audio" value={selectedAudioOption?.label} onClick={() => setView("audio")} /> : null}
              {textOptions.length ? <NavRow label="Subtitles" value={subtitleValue} onClick={() => setView("subtitles")} /> : null}
              {chapters.length ? <NavRow label="Chapters" value={selectedChapter?.title} onClick={() => setView("chapters")} /> : null}
              {textOptions.length ? <NavRow label="Accessibility" value={accessibilityValue} onClick={() => setView("accessibility")} /> : null}
              {!isLive ? <NavRow label="Loop" value={loop ? "On" : "Off"} arrow={false} onClick={onToggleLoop} /> : null}
              <NavRow label="Controls" value="Shortcuts" onClick={() => setView("controls")} />
            </div>
          </>
        ) : null}

        {detailHeader}
      </div>

      {audioOptions.length ? (
        <section style={sectionStyle("audio")}>
          <span>AUDIO</span>
          {audioOptions.map((option) => (
            <button key={option.id} type="button" className={selectedAudio === option.id ? "selected" : ""} onClick={() => onSelectAudio(option.id)}>
              {option.label}<small>{option.language.toUpperCase()} · {option.detail}</small>
            </button>
          ))}
        </section>
      ) : null}

      {qualities.length ? (
        <section style={sectionStyle("quality")}>
          <span>QUALITY</span>
          <button type="button" className={selectedQuality === "auto" ? "selected" : ""} onClick={() => onSelectQuality("auto")}>Auto <small>adaptive</small></button>
          {qualities.map((option) => (
            <button key={option.height} type="button" className={selectedQuality === option.height ? "selected" : ""} onClick={() => onSelectQuality(option.height)}>
              {option.height}p <small>{(option.bandwidth / 1_000_000).toFixed(1)} Mbps</small>
            </button>
          ))}
        </section>
      ) : null}

      {!isLive ? (
        <section style={sectionStyle("speed")}>
          <span>SPEED</span>
          <div className="vela-speed-grid">
            {SPEEDS.map((value) => (
              <button key={value} type="button" className={speed === value ? "selected" : ""} onClick={() => onSpeedChange(value)}>{value}×</button>
            ))}
          </div>
        </section>
      ) : null}

      {textOptions.length ? (
        <section style={sectionStyle("subtitles")}>
          <span>SUBTITLES</span>
          <button type="button" className={selectedText === "off" ? "selected" : ""} onClick={() => onSelectText("off")}>Off</button>
          {textOptions.map((option) => (
            <button key={option.id} type="button" className={selectedText === option.id ? "selected" : ""} onClick={() => onSelectText(option.id)}>
              {option.label}<small>{option.language.toUpperCase()}</small>
            </button>
          ))}
        </section>
      ) : null}

      {textOptions.length ? (
        <section style={sectionStyle("accessibility")}>
          <span>SUBTITLE STYLE</span>
          <div className="vela-setting-label">SIZE</div>
          <div className="vela-speed-grid">
            {CAPTION_SIZES.map((value) => (
              <button key={value} type="button" className={captionStyle.fontScale === value ? "selected" : ""} onClick={() => onCaptionStyleChange({ fontScale: value })}>{Math.round(value * 100)}%</button>
            ))}
          </div>
          <div className="vela-setting-label">EDGE</div>
          <div className="vela-speed-grid">
            {CAPTION_EDGES.map((value) => (
              <button key={value} type="button" className={captionStyle.edge === value ? "selected" : ""} onClick={() => onCaptionStyleChange({ edge: value })}>{value}</button>
            ))}
          </div>
          <div className="vela-setting-label">BACKGROUND</div>
          <div className="vela-speed-grid">
            {CAPTION_BACKGROUNDS.map((value) => (
              <button key={value} type="button" className={captionStyle.backgroundOpacity === value ? "selected" : ""} onClick={() => onCaptionStyleChange({ backgroundOpacity: value })}>{Math.round(value * 100)}%</button>
            ))}
          </div>
        </section>
      ) : null}

      {chapters.length ? (
        <section style={sectionStyle("chapters")}>
          <span>CHAPTERS</span>
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id ?? `${chapter.start}-${chapter.title}`}
              type="button"
              className={currentChapterStart === chapter.start ? "selected" : ""}
              onClick={() => onSeekChapter(chapter.start)}
            >
              {chapter.title}<small>{formatTime(chapter.start)} · {String(index + 1).padStart(2, "0")}</small>
            </button>
          ))}
        </section>
      ) : null}

      <section className="vela-shortcuts" style={sectionStyle("controls")}>
        <span>SHORTCUTS / GESTURES</span>
        <p><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> seek / play · <kbd>C</kbd> captions · <kbd>F</kbd> fullscreen</p>
        <p>double tap ±10s · swipe horizontally up to ±30s</p>
      </section>
    </div>
  );
}

function sameSettingsData(previous: SettingsMenuProps, next: SettingsMenuProps) {
  return previous.isLive === next.isLive
    && previous.loop === next.loop
    && previous.selectedQuality === next.selectedQuality
    && previous.qualities === next.qualities
    && previous.speed === next.speed
    && previous.audioOptions === next.audioOptions
    && previous.selectedAudio === next.selectedAudio
    && previous.textOptions === next.textOptions
    && previous.selectedText === next.selectedText
    && previous.captionStyle === next.captionStyle
    && previous.chapters === next.chapters
    && previous.currentChapterStart === next.currentChapterStart;
}

export const SettingsMenu = memo(SettingsMenuImpl, sameSettingsData);
