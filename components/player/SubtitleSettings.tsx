"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SubtitleSettingsOption = {
  id: string;
  label: string;
  language: string;
};

export type SubtitleSettingsMeta = {
  kind: "language" | "forced" | "sdh" | "cc" | "subtitle";
  text: string;
};

export type SubtitleSettingsPresentation = {
  off: boolean;
  label: string;
  code: string;
  meta: SubtitleSettingsMeta[];
};

type SubtitleSettingsProps = {
  options: ReadonlyArray<SubtitleSettingsOption>;
  selectedText: "off" | string;
  style?: CSSProperties;
  onSelect: (id: "off" | string) => void;
};

const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ko: "한국어",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
};

function languageCode(value: string) {
  return value.toLowerCase().split("-")[0] || "";
}

function nativeLanguageName(language: string, fallback: string) {
  const code = languageCode(language);
  if (NATIVE_LANGUAGE_NAMES[code]) return NATIVE_LANGUAGE_NAMES[code];
  if (!code) return fallback || "Subtitle";
  try {
    return new Intl.DisplayNames([code], {
      type: "language",
      languageDisplay: "standard",
    }).of(code) || fallback || code.toUpperCase();
  } catch {
    return fallback || code.toUpperCase();
  }
}

function englishLanguageName(language: string) {
  const code = languageCode(language);
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], {
      type: "language",
      languageDisplay: "standard",
    }).of(code) || "";
  } catch {
    return "";
  }
}

function classifyTrack(label: string): SubtitleSettingsMeta {
  const value = label.toLowerCase();
  if (/\bforced\b/.test(value)) return { kind: "forced", text: "Forced" };
  if (/\bsdh\b/.test(value)) return { kind: "sdh", text: "SDH" };
  if (/\bclosed captions?\b|\bcaptions?\b|\bcc\b/.test(value)) return { kind: "cc", text: "CC" };
  return { kind: "subtitle", text: "Subtitles" };
}

export function describeSubtitleOption(option?: SubtitleSettingsOption | null): SubtitleSettingsPresentation | null {
  if (!option) return null;
  const rawLabel = option.label.trim() || option.language.toUpperCase() || "Subtitle";
  const nativeName = nativeLanguageName(option.language, rawLabel);
  const englishName = englishLanguageName(option.language);
  const code = languageCode(option.language);
  const normalized = rawLabel.toLowerCase();
  const generic = [option.language, code, nativeName, englishName]
    .filter(Boolean)
    .some((value) => value.toLowerCase() === normalized);
  const type = classifyTrack(rawLabel);
  const meta: SubtitleSettingsMeta[] = [];
  if (option.language) meta.push({ kind: "language", text: option.language.toUpperCase() });
  meta.push(type);
  return {
    off: false,
    label: generic ? nativeName : rawLabel,
    code: option.language.toUpperCase() || "CC",
    meta,
  };
}

export const SUBTITLE_OFF_PRESENTATION: SubtitleSettingsPresentation = {
  off: true,
  label: "Off",
  code: "",
  meta: [],
};

export function SubtitleSettings({ options, selectedText, style, onSelect }: SubtitleSettingsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [confirmation, setConfirmation] = useState<SubtitleSettingsPresentation | null>(null);

  useEffect(() => {
    setPortalTarget(sectionRef.current?.closest(".vela-player") as HTMLElement | null);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const presentations = useMemo(
    () => new Map(options.map((option) => [option.id, describeSubtitleOption(option)])),
    [options],
  );
  const languageCount = useMemo(
    () => new Set(options.map((option) => languageCode(option.language)).filter(Boolean)).size,
    [options],
  );

  const select = (id: "off" | string) => {
    if (id === selectedText) return;
    const wasActive = selectedText !== "off";
    const willBeActive = id !== "off";
    onSelect(id);

    if (!(wasActive && willBeActive)) return;
    const option = options.find((item) => item.id === id);
    const presentation = describeSubtitleOption(option);
    if (!presentation) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setConfirmation(presentation);
    hideTimerRef.current = setTimeout(() => setConfirmation(null), 1650);
  };

  return (
    <>
      <section
        ref={sectionRef}
        style={style}
        data-vela-subtitle-section="true"
        data-vela-subtitle-owner="react"
      >
        <span>SUBTITLES</span>
        <div className="vela-subtitle-summary">
          <strong>{languageCount || options.length} {(languageCount || options.length) === 1 ? "language" : "languages"}</strong>
          <span>{options.length} {options.length === 1 ? "track" : "tracks"} · language · type</span>
        </div>

        <button
          type="button"
          className={selectedText === "off" ? "selected" : ""}
          data-vela-subtitle-option="true"
          data-vela-subtitle-label="Off"
          data-vela-subtitle-state="off"
          aria-label="Turn subtitles off"
          aria-pressed={selectedText === "off"}
          onClick={() => select("off")}
        >
          Off
        </button>

        {options.map((option) => {
          const presentation = presentations.get(option.id) ?? describeSubtitleOption(option);
          const label = presentation?.label ?? option.label;
          const meta = presentation?.meta ?? [];
          return (
            <button
              key={option.id}
              type="button"
              className={selectedText === option.id ? "selected" : ""}
              data-vela-subtitle-option="true"
              data-vela-subtitle-label={label}
              data-vela-subtitle-state="on"
              aria-label={[label, ...meta.map((item) => item.text)].join(", ")}
              aria-pressed={selectedText === option.id}
              onClick={() => select(option.id)}
            >
              {option.label}
              <small>{option.language.toUpperCase()}</small>
              <span className="vela-subtitle-meta-row">
                {meta.map((item, index) => (
                  <span
                    key={`${item.kind}-${item.text}-${index}`}
                    className="vela-subtitle-meta"
                    data-kind={item.kind}
                  >
                    {item.text}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </section>

      {portalTarget && confirmation ? createPortal(
        <div className="vela-subtitle-confirmation is-visible" role="status" aria-live="polite">
          <small>SUBTITLES</small>
          <strong>{confirmation.label}</strong>
          <span>{confirmation.meta.map((item) => item.text).join(" · ")}</span>
        </div>,
        portalTarget,
      ) : null}
    </>
  );
}
