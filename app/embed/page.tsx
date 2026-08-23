import { VelaEmbedClient } from "@/components/VelaEmbedClient";
import type { VelaSourceType } from "@/components/VelaPlayer";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fallbackSource = "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sourceType(value: string | undefined): VelaSourceType {
  return value === "hls" || value === "dash" || value === "mp4" ? value : "auto";
}

export default async function EmbedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <VelaEmbedClient
      src={one(params.src) ?? fallbackSource}
      sourceType={sourceType(one(params.type))}
      poster={one(params.poster)}
      title={one(params.title)}
      accent={one(params.accent)}
      thumbnailVtt={one(params.thumbnails)}
    />
  );
}
