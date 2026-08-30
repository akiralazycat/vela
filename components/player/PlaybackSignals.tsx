"use client";

import {
  type RefObject,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { VelaPlayerState } from "./core/contracts";

type PlaybackSignalsProps = {
  frameRef: RefObject<HTMLDivElement | null>;
  playerState: VelaPlayerState | null;
};

type SignalKind = "live" | "quality" | "audio" | "chapter" | "media";
type Signal = { kind: SignalKind; value: string; interactive?: "live" | "audio" };

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatOffset(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function languageName(language: string, fallback: string) {
  const code = language.toLowerCase().split("-")[0] || "";
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

function audioSignal(trackId: string | null, mediaBadges: string[]) {
  if (!trackId) return "";
  const parts = trackId.split(":");
  if (parts.length < 6) return trackId.toUpperCase();

  const language = parts[1] || "";
  const codecs = parts.at(-1) || "";
  const channels = Number.parseInt(parts.at(-2) || "0", 10);
  const roles = parts.at(-3) || "";
  const rawLabel = parts.slice(2, -3).join(":").trim();
  const code = language.toLowerCase().split("-")[0] || "";
  const nativeName = languageName(language, rawLabel || language.toUpperCase() || "Audio");
  const generic = !rawLabel
    || rawLabel.toLowerCase() === language.toLowerCase()
    || rawLabel.toLowerCase() === code
    || rawLabel.toLowerCase() === nativeName.toLowerCase();
  const label = generic ? nativeName : rawLabel;

  const detail: string[] = [];
  if (channels > 0) detail.push(channels >= 6 ? `${channels - 1}.1` : `${channels}CH`);
  if (roles.toLowerCase().includes("commentary")) detail.push("COMMENTARY");
  if (mediaBadges.some((badge) => /ATMOS|SPATIAL/.test(badge.toUpperCase()))) detail.push("SPATIAL");
  else if (/ec-3|eac3|ac-4/i.test(codecs)) detail.push("DOLBY AUDIO");

  return [label, ...detail].filter(Boolean).join(" · ").toUpperCase();
}

function currentChapterSignal(player: HTMLElement, state: VelaPlayerState) {
  if (!state.chapter || state.isLive) return "";
  const title = player.querySelector(".vela-current-chapter")?.textContent?.trim() || state.chapter;
  const seek = player.querySelector(".vela-seek-input");
  const markers = Array.from(player.querySelectorAll<HTMLElement>(".vela-chapter-marker"))
    .map((marker) => Number.parseFloat(marker.style.left || "0") / 100)
    .filter((ratio) => Number.isFinite(ratio))
    .sort((a, b) => a - b);

  if (!(seek instanceof HTMLInputElement) || !markers.length) return title;
  const min = Number.parseFloat(seek.min || "0");
  const max = Number.parseFloat(seek.max || "0");
  const value = Number.parseFloat(seek.value || "0");
  const span = max - min;
  if (!(span > 0)) return title;

  const ratio = clamp((value - min) / span, 0, 1);
  let index = 0;
  markers.forEach((markerRatio, markerIndex) => {
    if (ratio >= markerRatio) index = markerIndex;
  });
  return `CH ${String(index + 1).padStart(2, "0")} · ${title}`;
}

function navigateToAudioSettings(player: HTMLElement) {
  const step = () => {
    const popover = player.querySelector<HTMLElement>(".vela-settings-popover");
    if (!popover) {
      player.querySelector<HTMLButtonElement>(".vela-settings-button")?.click();
      window.setTimeout(step, 0);
      return;
    }

    const view = popover.dataset.velaSettingsView;
    if (view === "audio") return;
    if (view === "root") {
      const more = Array.from(popover.querySelectorAll<HTMLButtonElement>(".vela-settings-nav-row"))
        .find((row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === "More settings");
      more?.click();
      window.setTimeout(step, 0);
      return;
    }
    if (view === "more") {
      const audio = Array.from(popover.querySelectorAll<HTMLButtonElement>(".vela-settings-nav-row"))
        .find((row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === "Audio");
      audio?.click();
      return;
    }

    popover.querySelector<HTMLButtonElement>(".vela-settings-back")?.click();
    window.setTimeout(step, 0);
  };

  step();
}

export function PlaybackSignals({ frameRef, playerState }: PlaybackSignalsProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [decodedHeight, setDecodedHeight] = useState(0);

  useEffect(() => {
    const player = frameRef.current?.querySelector<HTMLElement>(".vela-player") || null;
    setPortalTarget(player);
    if (!player) return;
    player.dataset.velaSignals = "ready";
    player.dataset.velaSignalsOwner = "react";
    return () => {
      if (player.dataset.velaSignalsOwner === "react") {
        delete player.dataset.velaSignals;
        delete player.dataset.velaSignalsOwner;
      }
    };
  }, [frameRef]);

  useEffect(() => {
    const video = portalTarget?.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return;
    const sync = () => setDecodedHeight(video.videoHeight || 0);
    sync();
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("loadeddata", sync);
    video.addEventListener("resize", sync);
    return () => {
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("loadeddata", sync);
      video.removeEventListener("resize", sync);
    };
  }, [portalTarget]);

  const signals = useMemo<Signal[]>(() => {
    if (!playerState || !portalTarget) return [];
    const values: Signal[] = [];
    const video = portalTarget.querySelector("video");

    if (playerState.isLive) {
      let edge = Number.NaN;
      if (video instanceof HTMLVideoElement && video.seekable.length) {
        edge = video.seekable.end(video.seekable.length - 1);
      }
      const delay = Number.isFinite(edge)
        ? Math.max(edge - playerState.currentTime, 0)
        : playerState.atLiveEdge ? 0 : Number.NaN;
      const liveValue = !Number.isFinite(delay)
        ? "LIVE"
        : delay <= 2.5
          ? `LIVE · ${delay.toFixed(delay < 10 ? 1 : 0)}S`
          : `DVR · −${formatOffset(delay)}`;
      values.push({
        kind: "live",
        value: liveValue,
        interactive: playerState.atLiveEdge ? undefined : "live",
      });
    }

    const quality = playerState.sourceType === "mp4"
      ? decodedHeight ? `${decodedHeight}P` : ""
      : playerState.quality === "auto"
        ? decodedHeight ? `AUTO · ${decodedHeight}P` : "AUTO"
        : `${playerState.quality}P`;
    if (quality) values.push({ kind: "quality", value: quality });

    const audio = audioSignal(playerState.audioTrack, playerState.mediaBadges);
    if (audio) values.push({ kind: "audio", value: audio, interactive: "audio" });

    const chapter = currentChapterSignal(portalTarget, playerState);
    if (chapter) values.push({ kind: "chapter", value: chapter });

    playerState.mediaBadges.slice(0, 2).forEach((value) => values.push({ kind: "media", value }));
    return values;
  }, [decodedHeight, playerState, portalTarget]);

  if (!portalTarget || !playerState) return null;

  const activate = (signal: Signal) => {
    if (signal.interactive === "audio") {
      navigateToAudioSettings(portalTarget);
      return;
    }
    if (signal.interactive === "live") {
      portalTarget.querySelector<HTMLButtonElement>(".vela-live-button")?.click();
    }
  };

  return createPortal(
    <div
      className="vela-signal-rail"
      role="group"
      aria-label="Playback information"
      data-vela-signal-owner="react"
    >
      {signals.map((signal, index) => signal.interactive ? (
        <button
          key={`${signal.kind}-${signal.value}-${index}`}
          type="button"
          className="vela-signal-chip"
          data-kind={signal.kind}
          data-vela-audio-quick={signal.interactive === "audio" ? "true" : undefined}
          data-vela-live-action={signal.interactive === "live" ? "return" : undefined}
          aria-label={signal.interactive === "audio"
            ? `Audio: ${signal.value}. Open audio settings.`
            : `Return to live edge. ${signal.value}`}
          onClick={() => activate(signal)}
        >
          {signal.value}
        </button>
      ) : (
        <span key={`${signal.kind}-${signal.value}-${index}`} className="vela-signal-chip" data-kind={signal.kind}>
          {signal.value}
        </span>
      ))}
    </div>,
    portalTarget,
  );
}
