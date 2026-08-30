"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clamp } from "./core/utils";

type GestureZone = "left" | "center" | "right";

type UsePlayerGesturesOptions = {
  enabled: boolean;
  shellRef: RefObject<HTMLDivElement | null>;
  playing: boolean;
  onTogglePlay: () => void | Promise<void>;
  onSeekBy: (amount: number) => void;
  onShowControls: () => void;
};

export function usePlayerGestures({
  enabled,
  shellRef,
  playing,
  onTogglePlay,
  onSeekBy,
  onShowControls,
}: UsePlayerGesturesOptions) {
  const gestureRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const lastTapRef = useRef<{ zone: GestureZone; at: number } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  const flashGesture = useCallback((message: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setGestureHint(message);
    hintTimerRef.current = setTimeout(() => setGestureHint(null), 700);
  }, []);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLVideoElement>) => {
    if (!enabled) return;
    gestureRef.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  }, [enabled]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLVideoElement>) => {
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start) {
      if (event.pointerType === "mouse") void onTogglePlay();
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = performance.now() - start.at;

    if (event.pointerType === "touch" && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const amount = clamp(Math.round(dx / 7), -30, 30);
      onSeekBy(amount);
      flashGesture(`${amount > 0 ? "+" : ""}${amount}s`);
      return;
    }

    if (event.pointerType === "mouse") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && elapsed < 500) void onTogglePlay();
      return;
    }

    if (elapsed > 320) return;
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const zone: GestureZone = ratio < 0.34 ? "left" : ratio > 0.66 ? "right" : "center";
    const now = performance.now();
    const previous = lastTapRef.current;

    if (previous && previous.zone === zone && now - previous.at < 360) {
      lastTapRef.current = null;
      if (zone === "left") {
        onSeekBy(-10);
        flashGesture("−10s");
      } else if (zone === "right") {
        onSeekBy(10);
        flashGesture("+10s");
      } else {
        void onTogglePlay();
        flashGesture(playing ? "PAUSE" : "PLAY");
      }
      return;
    }

    lastTapRef.current = { zone, at: now };
    onShowControls();
  }, [flashGesture, onSeekBy, onShowControls, onTogglePlay, playing, shellRef]);

  return { gestureHint, handlePointerDown, handlePointerUp };
}
