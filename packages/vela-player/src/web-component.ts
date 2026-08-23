import { VelaEmbed, type VelaCaptionPatch, type VelaEmbedOptions, type VelaEmbedState } from "./index";

const observed = ["src", "type", "poster", "title", "accent", "thumbnails", "origin"];

export class VelaPlayerElement extends HTMLElement {
  static get observedAttributes() { return observed; }
  private controller: VelaEmbed | null = null;
  private frameHost: HTMLDivElement | null = null;

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `:host{display:block;position:relative;width:100%;aspect-ratio:16/9;background:#080908;overflow:hidden}div{width:100%;height:100%}`;
      this.frameHost = document.createElement("div");
      shadow.append(style, this.frameHost);
    } else {
      this.frameHost = this.shadowRoot.querySelector("div");
    }
    this.mount();
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) this.mount();
  }

  private options(): VelaEmbedOptions {
    return {
      src: this.getAttribute("src") || undefined,
      type: (this.getAttribute("type") as VelaEmbedOptions["type"]) || "auto",
      poster: this.getAttribute("poster") || undefined,
      title: this.getAttribute("title") || undefined,
      accent: this.getAttribute("accent") || undefined,
      thumbnails: this.getAttribute("thumbnails") || undefined,
      origin: this.getAttribute("origin") || undefined,
      loading: this.getAttribute("loading") === "eager" ? "eager" : "lazy",
    };
  }

  private mount() {
    if (!this.frameHost) return;
    this.controller?.destroy();
    this.controller = new VelaEmbed(this.frameHost, this.options());
    this.controller.on("ready", () => this.dispatchEvent(new CustomEvent("velaready")));
    this.controller.on("state", (state) => this.dispatchEvent(new CustomEvent("velastate", { detail: state })));
  }

  play() { this.controller?.play(); }
  pause() { this.controller?.pause(); }
  seek(seconds: number) { this.controller?.seek(seconds); }
  setVolume(value: number) { this.controller?.volume(value); }
  setQuality(value: "auto" | number) { this.controller?.quality(value); }
  setCaptions(value: "off" | string) { this.controller?.captions(value); }
  setAudio(value: string) { this.controller?.audio(value); }
  setCaptionStyle(value: VelaCaptionPatch) { this.controller?.captionStyle(value); }
  goLive() { this.controller?.live(); }
  nextChapter() { this.controller?.nextChapter(); }
  previousChapter() { this.controller?.previousChapter(); }
  getState(): VelaEmbedState | null { return this.controller?.getState() ?? null; }
}

if (typeof window !== "undefined" && !customElements.get("vela-player")) {
  customElements.define("vela-player", VelaPlayerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "vela-player": VelaPlayerElement;
  }
}
