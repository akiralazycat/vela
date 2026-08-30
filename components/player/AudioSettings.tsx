"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AudioSettingsOption = {
  id: string;
  label: string;
  language: string;
  detail: string;
};

export type AudioSettingsMeta = {
  kind: "language" | "format" | "spatial" | "commentary" | "primary";
  text: string;
};

export type AudioSettingsPresentation = {
  label: string;
  meta: AudioSettingsMeta[];
};

type AudioSettingsProps = {
  options: ReadonlyArray<AudioSettingsOption>;
  selectedAudio: string | null;
  style?: CSSProperties;
  onSelect: (id: string) => void;
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

function displayLanguageName(language: string, fallback: string) {
  const code = languageCode(language);
  if (NATIVE_LANGUAGE_NAMES[code]) return NATIVE_LANGUAGE_NAMES[code];
  if (!code) return fallback;

  try {
    return new Intl.DisplayNames([code], {
      type: "language",
      languageDisplay: "standard",
    }).of(code) || fallback;
  } catch {
    return fallback;
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

function detailMeta(detail: string): AudioSettingsMeta[] {
  return detail
    .split("·")
    .flatMap((part) => part.split(/\s*\/\s*|\s*,\s*/))
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap<AudioSettingsMeta>((token) => {
      const lower = token.toLowerCase();
      if (lower === "audio") return [];
      if (lower === "spatial") return [{ kind: "spatial", text: "Spatial" }];
      if (lower === "commentary") return [{ kind: "commentary", text: "Commentary" }];
      if (lower === "primary") return [{ kind: "primary", text: "Primary" }];
      return [{ kind: "format", text: token }];
    });
}

export function describeAudioOption(option?: AudioSettingsOption | null): AudioSettingsPresentation | null {
  if (!option) return null;

  const rawLabel = option.label.trim() || option.language.toUpperCase() || "Audio";
  const nativeName = displayLanguageName(option.language, rawLabel);
  const englishName = englishLanguageName(option.language);
  const code = languageCode(option.language);
  const normalized = rawLabel.toLowerCase();
  const generic = [option.language, code, nativeName, englishName]
    .filter(Boolean)
    .some((value) => value.toLowerCase() === normalized)
    || /^audio\s+\d+$/i.test(rawLabel);

  const meta: AudioSettingsMeta[] = [];
  if (option.language) meta.push({ kind: "language", text: option.language.toUpperCase() });
  meta.push(...detailMeta(option.detail));

  return {
    label: generic ? nativeName : rawLabel,
    meta,
  };
}

export function audioSignalLabel(option?: AudioSettingsOption | null) {
  const presentation = describeAudioOption(option);
  if (!presentation) return "";
  const secondary = presentation.meta
    .filter((item) => item.kind !== "language")
    .map((item) => item.text);
  return [presentation.label, ...secondary].filter(Boolean).join(" · ").toUpperCase();
}

export function AudioSettings({ options, selectedAudio, style, onSelect }: AudioSettingsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [confirmation, setConfirmation] = useState<AudioSettingsPresentation | null>(null);

  useEffect(() => {
    setPortalTarget(sectionRef.current?.closest(".vela-player") as HTMLElement | null);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const presentations = useMemo(
    () => new Map(options.map((option) => [option.id, describeAudioOption(option)])),
    [options],
  );

  const select = (option: AudioSettingsOption) => {
    if (option.id === selectedAudio) return;
    onSelect(option.id);
    const presentation = presentations.get(option.id) ?? describeAudioOption(option);
    if (!presentation) return;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setConfirmation(presentation);
    hideTimerRef.current = setTimeout(() => setConfirmation(null), 1800);
  };

  return (
    <>
      <section
        ref={sectionRef}
        style={style}
        data-vela-audio-section="true"
        data-vela-audio-owner="react"
      >
        <span>AUDIO</span>
        <div className="vela-audio-summary">
          <strong>{options.length} {options.length === 1 ? "track" : "tracks"}</strong>
          <span>Language · mix · role</span>
        </div>

        {options.map((option) => {
          const presentation = presentations.get(option.id) ?? describeAudioOption(option);
          const label = presentation?.label ?? option.label;
          const meta = presentation?.meta ?? [];
          return (
            <button
              key={option.id}
              type="button"
              className={selectedAudio === option.id ? "selected" : ""}
              data-vela-audio-option="true"
              data-vela-audio-label={label}
              aria-label={[label, ...meta.map((item) => item.text)].filter(Boolean).join(", ")}
              aria-pressed={selectedAudio === option.id}
              onClick={() => select(option)}
            >
              {option.label}
              <small>{option.language.toUpperCase()} · {option.detail}</small>
              <span className="vela-audio-meta-row">
                {meta.map((item, index) => (
                  <span
                    key={`${item.kind}-${item.text}-${index}`}
                    className="vela-audio-meta"
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
        <div className="vela-audio-confirmation is-visible" role="status" aria-live="polite">
          <small>AUDIO SWITCHED</small>
          <strong>{confirmation.label}</strong>
          <span>{confirmation.meta.map((item) => item.text).join(" · ")}</span>
        </div>,
        portalTarget,
      ) : null}
    </>
  );
}
