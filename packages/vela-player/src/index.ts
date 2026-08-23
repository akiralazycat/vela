export type VelaEmbedState = {
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  quality: "auto" | number;
  textTrack: "off" | string;
  audioTrack: string | null;
  sourceType: "hls" | "dash" | "mp4";
  isLive: boolean;
  atLiveEdge: boolean;
  liveLatencyMs: number | null;
  chapter: string | null;
  mediaBadges: string[];
};

export type VelaEmbedOptions = {
  src?: string;
  type?: "auto" | "hls" | "dash" | "mp4";
  poster?: string;
  title?: string;
  accent?: string;
  thumbnails?: string;
  origin?: string;
  loading?: "lazy" | "eager";
};

export type VelaCaptionPatch = {
  fontScale?: number;
  color?: string;
  background?: string;
  backgroundOpacity?: number;
  edge?: "none" | "shadow" | "outline";
  fontFamily?: "sans" | "serif" | "mono";
};

type Listener = (payload: unknown) => void;

const DEFAULT_ORIGIN = "https://vela.manabeakira.com";

function datasetOptions(element: HTMLElement): VelaEmbedOptions {
  return {
    src: element.dataset.src,
    type: (element.dataset.type as VelaEmbedOptions["type"]) || "auto",
    poster: element.dataset.poster,
    title: element.dataset.title,
    accent: element.dataset.accent,
    thumbnails: element.dataset.thumbnails,
    origin: element.dataset.origin,
  };
}

export class VelaEmbed {
  readonly target: HTMLElement;
  readonly iframe: HTMLIFrameElement;
  readonly options: VelaEmbedOptions;
  private listeners = new Map<string, Set<Listener>>();
  private state: VelaEmbedState | null = null;

  constructor(target: string | HTMLElement, options: VelaEmbedOptions = {}) {
    const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (!element) throw new Error("Vela: mount target not found");
    this.target = element;
    this.options = { ...datasetOptions(element), ...options };

    const origin = this.options.origin || DEFAULT_ORIGIN;
    const url = new URL("/embed", origin);
    const params: Record<string, string | undefined> = {
      src: this.options.src,
      type: this.options.type,
      poster: this.options.poster,
      title: this.options.title,
      accent: this.options.accent,
      thumbnails: this.options.thumbnails,
    };
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    this.iframe = document.createElement("iframe");
    this.iframe.src = url.toString();
    this.iframe.title = this.options.title || "Vela video player";
    this.iframe.allow = "autoplay; fullscreen; picture-in-picture";
    this.iframe.allowFullscreen = true;
    this.iframe.loading = this.options.loading || "lazy";
    this.iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#080908";
    this.target.replaceChildren(this.iframe);
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
  }

  private handleMessage(event: MessageEvent) {
    if (event.source !== this.iframe.contentWindow || !event.data) return;
    if (event.data.type === "vela:ready") this.emit("ready", null);
    if (event.data.type === "vela:state") {
      this.state = event.data.state as VelaEmbedState;
      this.emit("state", this.state);
    }
  }

  private emit(name: string, payload: unknown) {
    this.listeners.get(name)?.forEach((listener) => listener(payload));
  }

  on(name: "ready" | "state", listener: Listener) {
    const listeners = this.listeners.get(name) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(name, listeners);
    return this;
  }

  off(name: "ready" | "state", listener: Listener) {
    this.listeners.get(name)?.delete(listener);
    return this;
  }

  command(command: string, value?: unknown) {
    this.iframe.contentWindow?.postMessage({ type: "vela:command", command, value }, "*");
    return this;
  }

  play() { return this.command("play"); }
  pause() { return this.command("pause"); }
  seek(seconds: number) { return this.command("seek", seconds); }
  volume(value: number) { return this.command("volume", value); }
  quality(value: "auto" | number) { return this.command("quality", value); }
  captions(value: "off" | string) { return this.command("captions", value); }
  audio(value: string) { return this.command("audio", value); }
  captionStyle(value: VelaCaptionPatch) { return this.command("captionStyle", value); }
  live() { return this.command("live"); }
  nextChapter() { return this.command("nextChapter"); }
  previousChapter() { return this.command("previousChapter"); }
  getState() { return this.state; }

  destroy() {
    window.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
    this.target.replaceChildren();
  }
}

export const Vela = {
  version: "0.3.0",
  mount(target: string | HTMLElement, options?: VelaEmbedOptions) {
    return new VelaEmbed(target, options);
  },
};
