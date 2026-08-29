"use client";

import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { findThumbnailCue, loadThumbnailVtt, type ThumbnailCue } from "../../lib/thumbnail-vtt";

export type TimelinePreviewPoint = {
  x: number;
  time: number;
};

type TimelinePreviewProps = {
  preview: TimelinePreviewPoint | null;
  containerRef: RefObject<HTMLDivElement | null>;
  thumbnailVtt?: string;
  chapterTitle?: string | null;
  isLive: boolean;
  timelineEnd: number;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function TimelinePreview({
  preview,
  containerRef,
  thumbnailVtt,
  chapterTitle,
  isLive,
  timelineEnd,
}: TimelinePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [thumbnailCues, setThumbnailCues] = useState<ThumbnailCue[]>([]);
  const [spriteSize, setSpriteSize] = useState<{ width: number; height: number } | null>(null);
  const [edgeShift, setEdgeShift] = useState(0);

  useEffect(() => {
    if (!thumbnailVtt || isLive) {
      setThumbnailCues([]);
      setSpriteSize(null);
      return;
    }

    const controller = new AbortController();
    loadThumbnailVtt(thumbnailVtt, controller.signal)
      .then(setThumbnailCues)
      .catch(() => setThumbnailCues([]));
    return () => controller.abort();
  }, [isLive, thumbnailVtt]);

  useEffect(() => {
    const first = thumbnailCues[0];
    if (!first || typeof window === "undefined") {
      setSpriteSize(null);
      return;
    }

    const image = new Image();
    image.onload = () => setSpriteSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setSpriteSize(null);
    image.src = first.url;
  }, [thumbnailCues]);

  useLayoutEffect(() => {
    const wrap = containerRef.current;
    const node = previewRef.current;
    if (!preview || !wrap || !node) {
      setEdgeShift(0);
      return;
    }

    const measure = () => {
      const width = wrap.clientWidth;
      const previewWidth = node.offsetWidth;
      if (!(width > 0) || !(previewWidth > 0)) {
        setEdgeShift(0);
        return;
      }

      const margin = 6;
      const idealCenter = clamp(preview.x / 100, 0, 1) * width;
      const minCenter = Math.min(previewWidth / 2 + margin, width / 2);
      const maxCenter = Math.max(width - previewWidth / 2 - margin, width / 2);
      setEdgeShift(clamp(idealCenter, minCenter, maxCenter) - idealCenter);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef, isLive, preview]);

  const previewCue = preview && !isLive ? findThumbnailCue(thumbnailCues, preview.time) : null;
  const previewImageStyle = useMemo<CSSProperties | undefined>(() => {
    if (!previewCue) return undefined;
    const base: CSSProperties = { backgroundImage: `url("${previewCue.url}")` };

    if (
      spriteSize && previewCue.width && previewCue.height &&
      previewCue.x !== undefined && previewCue.y !== undefined
    ) {
      const xDenominator = Math.max(spriteSize.width - previewCue.width, 1);
      const yDenominator = Math.max(spriteSize.height - previewCue.height, 1);
      return {
        ...base,
        backgroundSize: `${(spriteSize.width / previewCue.width) * 100}% ${(spriteSize.height / previewCue.height) * 100}%`,
        backgroundPosition: `${(previewCue.x / xDenominator) * 100}% ${(previewCue.y / yDenominator) * 100}%`,
      };
    }

    return { ...base, backgroundSize: "cover", backgroundPosition: "center" };
  }, [previewCue, spriteSize]);

  if (!preview) return null;

  const delay = isLive ? Math.max(timelineEnd - preview.time, 0) : 0;
  const atLiveEdge = isLive && delay <= 2.5;
  const style = {
    left: `${preview.x}%`,
    "--vela-preview-edge-shift": `${edgeShift}px`,
  } as CSSProperties;

  return (
    <div
      ref={previewRef}
      className={`vela-preview ${Math.abs(edgeShift) > 0.5 ? "is-edge-adjusted" : ""}`}
      style={style}
      data-vela-live-preview-state={isLive ? (atLiveEdge ? "edge" : "dvr") : undefined}
      data-vela-live-preview-kicker={isLive ? (atLiveEdge ? "EDGE" : "DVR") : undefined}
      data-vela-live-preview-label={isLive ? (atLiveEdge ? "LIVE" : `−${formatTime(delay)}`) : undefined}
      data-vela-preview-owner="react"
    >
      {isLive ? (
        <>
          <span className="vela-live-preview-kicker">{atLiveEdge ? "EDGE" : "DVR"}</span>
          <span className="vela-live-preview-label">{atLiveEdge ? "LIVE" : `−${formatTime(delay)}`}</span>
        </>
      ) : (
        <>
          {previewImageStyle
            ? <div className="vela-preview-image" style={previewImageStyle} />
            : <div className="vela-preview-empty" />}
          {chapterTitle ? <span className="vela-preview-chapter">{chapterTitle}</span> : null}
          <span>{formatTime(preview.time)}</span>
        </>
      )}
    </div>
  );
}
