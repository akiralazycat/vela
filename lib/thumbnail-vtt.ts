export type ThumbnailCue = {
  start: number;
  end: number;
  url: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function parseTimestamp(value: string) {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function resolveAssetUrl(asset: string, vttUrl: string) {
  if (typeof window === "undefined") return asset;
  const absoluteVtt = new URL(vttUrl, window.location.href);
  return new URL(asset, absoluteVtt).toString();
}

export function parseThumbnailVtt(text: string, vttUrl: string): ThumbnailCue[] {
  const blocks = text.replace(/^\uFEFF/, "").split(/\r?\n\r?\n/);
  const cues: ThumbnailCue[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0 || !lines[timingIndex + 1]) continue;

    const [startRaw, endRawWithSettings] = lines[timingIndex].split("-->").map((part) => part.trim());
    const endRaw = endRawWithSettings.split(/\s+/)[0];
    const payload = lines[timingIndex + 1];
    const [asset, fragment] = payload.split("#xywh=");
    const cue: ThumbnailCue = {
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      url: resolveAssetUrl(asset, vttUrl),
    };

    if (fragment) {
      const [x, y, width, height] = fragment.split(",").map(Number);
      if ([x, y, width, height].every(Number.isFinite)) {
        cue.x = x;
        cue.y = y;
        cue.width = width;
        cue.height = height;
      }
    }

    cues.push(cue);
  }

  return cues.sort((a, b) => a.start - b.start);
}

export async function loadThumbnailVtt(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Thumbnail VTT request failed: ${response.status}`);
  return parseThumbnailVtt(await response.text(), url);
}

export function findThumbnailCue(cues: ThumbnailCue[], time: number) {
  return cues.find((cue) => time >= cue.start && time < cue.end) ?? cues.at(-1) ?? null;
}
