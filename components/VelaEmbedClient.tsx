"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  VelaPlayer,
  type VelaCaptionStyle,
  type VelaDisplayMode,
  type VelaPlayerHandle,
  type VelaPlayerState,
  type VelaSourceType,
} from "@/components/VelaPlayer";

type EmbedProps = {
  src: string;
  sourceType: VelaSourceType;
  poster?: string;
  title?: string;
  accent?: string;
  thumbnailVtt?: string;
  parentOrigin?: string;
  displayMode?: VelaDisplayMode;
  autoPlay?: boolean;
  gestures?: boolean;
};

type VelaCommand = {
  type: "vela:command";
  command:
    | "play"
    | "pause"
    | "seek"
    | "volume"
    | "quality"
    | "captions"
    | "audio"
    | "captionStyle"
    | "live"
    | "nextChapter"
    | "previousChapter";
  value?: number | string | Partial<VelaCaptionStyle>;
};

function normalizeParentOrigin(value?: string) {
  if (!value || value === "*") return "*";
  try {
    return new URL(value).origin;
  } catch {
    return "*";
  }
}

export function VelaEmbedClient({
  src,
  sourceType,
  poster,
  title,
  accent,
  thumbnailVtt,
  parentOrigin,
  displayMode = "default",
  autoPlay = false,
  gestures = true,
}: EmbedProps) {
  const playerRef = useRef<VelaPlayerHandle>(null);
  const targetOrigin = useMemo(() => normalizeParentOrigin(parentOrigin), [parentOrigin]);

  useEffect(() => {
    const handler = (event: MessageEvent<VelaCommand>) => {
      if (event.source !== window.parent || event.data?.type !== "vela:command") return;
      if (targetOrigin !== "*" && event.origin !== targetOrigin) return;
      const api = playerRef.current;
      if (!api) return;
      const { command, value } = event.data;
      if (command === "play") void api.play().catch(() => undefined);
      else if (command === "pause") api.pause();
      else if (command === "seek" && typeof value === "number") api.seek(value);
      else if (command === "volume" && typeof value === "number") api.setVolume(value);
      else if (command === "quality" && (typeof value === "number" || value === "auto")) api.setQuality(value);
      else if (command === "captions" && typeof value === "string") api.setTextTrack(value);
      else if (command === "audio" && typeof value === "string") api.setAudioTrack(value);
      else if (command === "captionStyle" && value && typeof value === "object") api.setCaptionStyle(value as Partial<VelaCaptionStyle>);
      else if (command === "live") api.goLive();
      else if (command === "nextChapter") api.nextChapter();
      else if (command === "previousChapter") api.previousChapter();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [targetOrigin]);

  const emitState = (state: VelaPlayerState) => {
    window.parent.postMessage({ type: "vela:state", state }, targetOrigin);
  };

  return (
    <main className="embed-shell">
      <VelaPlayer
        ref={playerRef}
        src={src}
        sourceType={sourceType}
        poster={poster}
        title={title ?? "Vela Player"}
        eyebrow="VELA EMBED"
        accent={accent}
        thumbnailVtt={thumbnailVtt}
        displayMode={displayMode}
        autoPlay={autoPlay}
        gestures={gestures}
        onReady={() => window.parent.postMessage({ type: "vela:ready" }, targetOrigin)}
        onStateChange={emitState}
      />
    </main>
  );
}
