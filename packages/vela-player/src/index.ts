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
  displayMode?: "default" | "minimal";
  autoPlay?: boolean;
  gestures?: boolean;
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
type QueuedCommand = { command: string; value?: unknown };

const DEFAULT_ORIGIN = "https://vela.manabeakira.com";

function optionalBoolean(value: string | undefined) {
  if (value === undefined) return undefined;
  return value !== "false" && value !== "0" && value !== "off";
}

function datasetOptions(element: HTMLElement): VelaEmbedOptions {
  const displayMode = element.dataset.displayMode;
  return {
    src: element.dataset.src,
    type: (element.dataset.type as VelaEmbedOptions["type"]) || "auto",
    poster: element.dataset.poster,
    title: element.dataset.title,
    accent: element.dataset.accent,
    thumbnails: element.dataset.thumbnails,
    origin: element.dataset.origin,
    loading: element.dataset.loading === "eager" ? "eager" : undefined,
    displayMode: displayMode === "minimal" || displayMode === "default" ? displayMode : undefined,
    autoPlay: optionalBoolean(element.dataset.autoplay),
    gestures: optionalBoolean(element.dataset.gestures),
  };
}

export class VelaEmbed {
  readonly target: HTMLElement;
  readonly iframe: HTMLIFrameElement;
  readonly options: VelaEmbedOptions;
  private listeners = new Map<string, Set<Listener>>();
  private state: VelaEmbedState | null = null;
  private ready = false;
  private commandQueue: QueuedCommand[] = [];
  private readonly playerOrigin: string;

  constructor(target: string | HTMLElement, options: VelaEmbedOptions = {}) {
    const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (!element) throw new Error("Vela: mount target not found");
    this.target = element;
    this.options = { ...datasetOptions(element), ...options };

    const origin = this.options.origin || DEFAULT_ORIGIN;
    const url = new URL("/embed", origin);
    const parentOrigin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "*";
    const params: Record<string, string | undefined> = {
      src: this.options.src,
      type: this.options.type,
      poster: this.options.poster,
      title: this.options.title,
      accent: this.options.accent,
      thumbnails: this.options.thumbnails,
      display: this.options.displayMode,
      autoplay: this.options.autoPlay === undefined ? undefined : this.options.autoPlay ? "1" : "0",
      gestures: this.options.gestures === undefined ? undefined : this.options.gestures ? "1" : "0",
      parentOrigin,
    };
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    });
    this.playerOrigin = url.origin;

    this.iframe = document.createElement("iframe");
    this.iframe.title = this.options.title || "Vela video player";
    this.iframe.allow = "autoplay; fullscreen; picture-in-picture";
    this.iframe.allowFullscreen = true;
    this.iframe.loading = this.options.loading || "lazy";
    this.iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#080908";
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener("message", this.handleMessage);
    this.iframe.src = url.toString();
    this.target.replaceChildren(this.iframe);
  }

  private postCommand(payload: QueuedCommand) {
    this.iframe.contentWindow?.postMessage({ type: "vela:command", ...payload }, this.playerOrigin);
  }

  private handleMessage(event: MessageEvent) {
    if (event.source !== this.iframe.contentWindow || event.origin !== this.playerOrigin || !event.data) return;
    if (event.data.type === "vela:ready") {
      this.ready = true;
      const queued = this.commandQueue.splice(0);
      queued.forEach((payload) => this.postCommand(payload));
      this.emit("ready", null);
    }
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
    const payload = { command, value };
    if (this.ready) this.postCommand(payload);
    else this.commandQueue.push(payload);
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
    this.ready = false;
    this.commandQueue = [];
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
