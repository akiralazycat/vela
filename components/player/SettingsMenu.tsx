"use client";

import { memo, type CSSProperties, useEffect, useRef, useState } from "react";
import { AudioSettings, describeAudioOption, type AudioSettingsOption } from "./AudioSettings";
import {
  AccessibilitySettings,
  accessibilitySummary,
  type AccessibilityCaptionStyle,
} from "./AccessibilitySettings";
import {
  SubtitleSettings,
  describeSubtitleOption,
  type SubtitleSettingsOption,
} from "./SubtitleSettings";

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

type SettingsChapter = {
  id?: string;
  title: string;
  start: number;
  end?: number;
};

type SettingsMenuProps = {
  isLive: boolean;
  loop: boolean;
  selectedQuality: "auto" | number;
  qualities: ReadonlyArray<SettingsQualityOption>;
  speed: number;
  audioOptions: ReadonlyArray<AudioSettingsOption>;
  selectedAudio: string | null;
  textOptions: ReadonlyArray<SubtitleSettingsOption>;
  selectedText: "off" | string;
  captionStyle: AccessibilityCaptionStyle;
  chapters: ReadonlyArray<SettingsChapter>;
  currentChapterStart?: number | null;
  onSelectAudio: (id: string) => void;
  onSelectQuality: (quality: "auto" | number) => void;
  onSpeedChange: (value: number) => void;
  onSelectText: (id: "off" | string) => void;
  onCaptionStyleChange: (patch: Partial<AccessibilityCaptionStyle>) => void;
  onSeekChapter: (time: number) => void;
  onToggleLoop: () => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

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
  pressed,
}: {
  label: string;
  value?: string;
  onClick: () => void;
  arrow?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      className={`vela-settings-nav-row ${arrow ? "" : "vela-settings-nav-action"}`}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
    >
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
  const selectedAudioPresentation = describeAudioOption(selectedAudioOption);
  const selectedTextOption = textOptions.find((option) => option.id === selectedText);
  const selectedTextPresentation = describeSubtitleOption(selectedTextOption);
  const selectedChapter = chapters.find((chapter) => chapter.start === currentChapterStart);
  const qualityValue = selectedQuality === "auto"
    ? decodedHeight ? `Auto · ${decodedHeight}p` : "Auto"
    : `${selectedQuality}p`;
  const subtitleValue = selectedText === "off" ? "Off" : selectedTextPresentation?.label || "On";
  const accessibilityValue = accessibilitySummary(captionStyle);

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
              {audioOptions.length ? <NavRow label="Audio" value={selectedAudioPresentation?.label} onClick={() => setView("audio")} /> : null}
              {textOptions.length ? <NavRow label="Subtitles" value={subtitleValue} onClick={() => setView("subtitles")} /> : null}
              {chapters.length ? <NavRow label="Chapters" value={selectedChapter?.title} onClick={() => setView("chapters")} /> : null}
              {textOptions.length ? <NavRow label="Accessibility" value={accessibilityValue} onClick={() => setView("accessibility")} /> : null}
              {!isLive ? <NavRow label="Loop" value={loop ? "On" : "Off"} arrow={false} pressed={loop} onClick={onToggleLoop} /> : null}
              <NavRow label="Controls" value="Shortcuts" onClick={() => setView("controls")} />
            </div>
          </>
        ) : null}

        {detailHeader}
      </div>

      {audioOptions.length ? (
        <AudioSettings
          options={audioOptions}
          selectedAudio={selectedAudio}
          style={sectionStyle("audio")}
          onSelect={onSelectAudio}
        />
      ) : null}

      {qualities.length ? (
        <section style={sectionStyle("quality")}>
          <span>QUALITY</span>
          <button
            type="button"
            className={selectedQuality === "auto" ? "selected" : ""}
            aria-pressed={selectedQuality === "auto"}
            onClick={() => onSelectQuality("auto")}
          >
            Auto <small>adaptive</small>
          </button>
          {qualities.map((option) => (
            <button
              key={option.height}
              type="button"
              className={selectedQuality === option.height ? "selected" : ""}
              aria-pressed={selectedQuality === option.height}
              onClick={() => onSelectQuality(option.height)}
            >
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
              <button
                key={value}
                type="button"
                className={speed === value ? "selected" : ""}
                aria-pressed={speed === value}
                onClick={() => onSpeedChange(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {textOptions.length ? (
        <SubtitleSettings
          options={textOptions}
          selectedText={selectedText}
          style={sectionStyle("subtitles")}
          onSelect={onSelectText}
        />
      ) : null}

      {textOptions.length ? (
        <AccessibilitySettings
          captionStyle={captionStyle}
          style={sectionStyle("accessibility")}
          onChange={onCaptionStyleChange}
        />
      ) : null}

      {chapters.length ? (
        <section style={sectionStyle("chapters")}>
          <span>CHAPTERS</span>
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id ?? `${chapter.start}-${chapter.title}`}
              type="button"
              className={currentChapterStart === chapter.start ? "selected" : ""}
              aria-current={currentChapterStart === chapter.start ? "true" : undefined}
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
