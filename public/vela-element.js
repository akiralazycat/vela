(function () {
  "use strict";

  var script = document.currentScript;
  var defaultOrigin = script && script.src ? new URL(script.src).origin : window.location.origin;

  class VelaPlayerElement extends HTMLElement {
    static get observedAttributes() { return ["src", "type", "poster", "title", "accent", "thumbnails", "origin"]; }

    connectedCallback() {
      if (!this.shadowRoot) {
        var shadow = this.attachShadow({ mode: "open" });
        var style = document.createElement("style");
        style.textContent = ":host{display:block;position:relative;width:100%;aspect-ratio:16/9;background:#080908;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0;background:#080908}";
        this.frame = document.createElement("iframe");
        shadow.append(style, this.frame);
      }
      this.mount();
      this.onMessage = this.onMessage.bind(this);
      window.addEventListener("message", this.onMessage);
    }

    disconnectedCallback() { window.removeEventListener("message", this.onMessage); }
    attributeChangedCallback() { if (this.isConnected && this.frame) this.mount(); }

    mount() {
      var origin = this.getAttribute("origin") || defaultOrigin;
      var url = new URL("/embed", origin);
      var pairs = {
        src: this.getAttribute("src"),
        type: this.getAttribute("type") || "auto",
        poster: this.getAttribute("poster"),
        title: this.getAttribute("title"),
        accent: this.getAttribute("accent"),
        thumbnails: this.getAttribute("thumbnails")
      };
      Object.keys(pairs).forEach(function (key) { if (pairs[key]) url.searchParams.set(key, pairs[key]); });
      this.frame.src = url.toString();
      this.frame.title = this.getAttribute("title") || "Vela video player";
      this.frame.allow = "autoplay; fullscreen; picture-in-picture";
      this.frame.allowFullscreen = true;
    }

    onMessage(event) {
      if (event.source !== this.frame.contentWindow || !event.data) return;
      if (event.data.type === "vela:ready") this.dispatchEvent(new CustomEvent("velaready"));
      if (event.data.type === "vela:state") {
        this.state = event.data.state;
        this.dispatchEvent(new CustomEvent("velastate", { detail: this.state }));
      }
    }

    command(command, value) { this.frame.contentWindow && this.frame.contentWindow.postMessage({ type: "vela:command", command: command, value: value }, "*"); return this; }
    play() { return this.command("play"); }
    pause() { return this.command("pause"); }
    seek(value) { return this.command("seek", value); }
    setVolume(value) { return this.command("volume", value); }
    setQuality(value) { return this.command("quality", value); }
    setCaptions(value) { return this.command("captions", value); }
    setAudio(value) { return this.command("audio", value); }
    setCaptionStyle(value) { return this.command("captionStyle", value); }
    goLive() { return this.command("live"); }
    nextChapter() { return this.command("nextChapter"); }
    previousChapter() { return this.command("previousChapter"); }
    getState() { return this.state || null; }
  }

  if (!customElements.get("vela-player")) customElements.define("vela-player", VelaPlayerElement);
})();
