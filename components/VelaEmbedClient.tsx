"use client";

import { useEffect, useRef } from "react";
import { VelaPlayer, type VelaPlayerHandle, type VelaPlayerState, type VelaSourceType } from "@/components/VelaPlayer";

type EmbedProps = {
  src: string;
  sourceType: VelaSourceType;
  poster?: string;
  title?: string;
  accent?: string;
  thumbnailVtt?: string;
};

type VelaCommand = {
  type: "vela:command";
  command: "play" | "pause" | "seek" | "volume" | "quality" | "captions";
  value?: number | string;
};

export function VelaEmbedClient({ src, sourceType, poster, title, accent, thumbnailVtt }: EmbedProps) {
  const playerRef = useRef<VelaPlayerHandle>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<VelaCommand>) => {
      if (event.source !== window.parent || event.data?.type !== "vela:command") return;
      const api = playerRef.current;
      if (!api) return;
      const { command, value } = event.data;
      if (command === "play") void api.play();
      else if (command === "pause") api.pause();
      else if (command === "seek" && typeof value === "number") api.seek(value);
      else if (command === "volume" && typeof value === "number") api.setVolume(value);
      else if (command === "quality" && (typeof value === "number" || value === "auto")) api.setQuality(value);
      else if (command === "captions" && typeof value === "string") api.setTextTrack(value);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const emitState = (state: VelaPlayerState) => {
    window.parent.postMessage({ type: "vela:state", state }, "*");
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
        onReady={() => window.parent.postMessage({ type: "vela:ready" }, "*")}
        onStateChange={emitState}
      />
    </main>
  );
}
