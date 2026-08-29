"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { TimelinePreview, type TimelinePreviewPoint } from "./TimelinePreview";

export type TimelineChapter = {
  id?: string;
  title: string;
  start: number;
  end?: number;
};

type TimelineProps = {
  currentTime: number;
  buffered: number;
  duration: number;
  isLive: boolean;
  seekWindow: { start: number; end: number };
  chapters: TimelineChapter[];
  thumbnailVtt?: string;
  onSeek: (time: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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

export function Timeline({
  currentTime,
  buffered,
  duration,
  isLive,
  seekWindow,
  chapters,
  thumbnailVtt,
  onSeek,
}: TimelineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const touchPointerIdRef = useRef<number | null>(null);
  const [preview, setPreview] = useState<TimelinePreviewPoint | null>(null);
  const [isTouchScrubbing, setIsTouchScrubbing] = useState(false);

  const timelineStart = isLive ? seekWindow.start : 0;
  const timelineEnd = isLive ? seekWindow.end : duration;
  const timelineSpan = Math.max(timelineEnd - timelineStart, 0);
  const progress = timelineSpan
    ? clamp(((currentTime - timelineStart) / timelineSpan) * 100, 0, 100)
    : 0;
  const bufferedProgress = timelineSpan
    ? clamp(((buffered - timelineStart) / timelineSpan) * 100, 0, 100)
    : 0;
  const liveDelay = isLive ? Math.max(timelineEnd - currentTime, 0) : 0;
  const atLiveEdge = isLive && liveDelay <= 2.5;

  const previewChapter = useMemo(() => {
    if (!preview) return null;
    return chapters.find((chapter, index) => {
      const end = chapter.end ?? chapters[index + 1]?.start ?? timelineEnd;
      return preview.time >= chapter.start && preview.time < end;
    }) ?? null;
  }, [chapters, preview, timelineEnd]);

  const updatePreview = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!(rect.width > 0)) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setPreview({ x: ratio * 100, time: timelineStart + ratio * timelineSpan });
  };

  const beginScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    updatePreview(event);
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    touchPointerIdRef.current = event.pointerId;
    setIsTouchScrubbing(true);
  };

  const finishScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchPointerIdRef.current === null || event.pointerId !== touchPointerIdRef.current) return;
    touchPointerIdRef.current = null;
    setIsTouchScrubbing(false);
    setPreview(null);
  };

  const wrapStyle = {
    "--vela-preview-anchor": preview ? `${preview.x}%` : "-100px",
    "--vela-preview-anchor-opacity": preview ? 1 : 0,
  } as CSSProperties;

  return (
    <div
      ref={wrapRef}
      className={`vela-timeline-wrap ${isTouchScrubbing ? "is-touch-scrubbing" : ""}`}
      style={wrapStyle}
      data-vela-timeline-owner="react"
      onPointerDown={beginScrub}
      onPointerMove={updatePreview}
      onPointerUp={finishScrub}
      onPointerCancel={finishScrub}
      onLostPointerCapture={finishScrub}
      onPointerLeave={() => {
        if (!isTouchScrubbing) setPreview(null);
      }}
    >
      {isLive ? (
        <div className="vela-live-timeline-context" aria-hidden="true" data-vela-live-context-owner="react">
          <span data-part="window">DVR · {formatTime(timelineSpan)}</span>
          <span data-part="edge" data-state={atLiveEdge ? "edge" : "behind"}>
            {atLiveEdge ? "LIVE EDGE" : `−${formatTime(liveDelay)} TO LIVE`}
          </span>
        </div>
      ) : null}

      <TimelinePreview
        preview={preview}
        containerRef={wrapRef}
        thumbnailVtt={thumbnailVtt}
        chapterTitle={previewChapter?.title}
        isLive={isLive}
        timelineEnd={timelineEnd}
      />

      <div className="vela-timeline" aria-hidden="true">
        <span className="vela-buffered" style={{ width: `${bufferedProgress}%` }} />
        <span className="vela-progress" style={{ width: `${progress}%` }} />
        {chapters.map((chapter) => {
          if (!timelineSpan || chapter.start < timelineStart || chapter.start > timelineEnd) return null;
          return (
            <span
              key={chapter.id ?? `${chapter.start}-${chapter.title}`}
              className="vela-chapter-marker"
              data-vela-chapter-title={chapter.title}
              style={{ left: `${((chapter.start - timelineStart) / timelineSpan) * 100}%` }}
            />
          );
        })}
      </div>

      <input
        className="vela-seek-input"
        type="range"
        min={timelineStart}
        max={timelineEnd || timelineStart}
        step="0.01"
        value={clamp(currentTime, timelineStart, timelineEnd || timelineStart)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label={isLive ? "Seek live DVR window" : "Seek video"}
      />
    </div>
  );
}
