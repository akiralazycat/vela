(function () {
  "use strict";

  var script = document.currentScript;
  var defaultOrigin = script && script.src ? new URL(script.src).origin : window.location.origin;

  class VelaPlayerElement extends HTMLElement {
    static get observedAttributes() {
      return ["src", "type", "poster", "title", "accent", "thumbnails", "origin", "loading", "display-mode", "autoplay", "gestures"];
    }

    connectedCallback() {
      if (!this.shadowRoot) {
        var shadow = this.attachShadow({ mode: "open" });
        var style = document.createElement("style");
        style.textContent = ":host{display:block;position:relative;width:100%;aspect-ratio:16/9;background:#080908;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0;background:#080908}";
        this.frame = document.createElement("iframe");
        shadow.append(style, this.frame);
      }
      this.ready = false;
      this.commandQueue = [];
      this.onMessage = this.onMessage.bind(this);
      window.addEventListener("message", this.onMessage);
      this.mount();
    }

    disconnectedCallback() {
      window.removeEventListener("message", this.onMessage);
      this.ready = false;
      this.commandQueue = [];
    }

    attributeChangedCallback() {
      if (this.isConnected && this.frame) this.mount();
    }

    optionalBoolean(name) {
      if (!this.hasAttribute(name)) return undefined;
      var value = this.getAttribute(name);
      return value !== "false" && value !== "0" && value !== "off";
    }

    mount() {
      var origin = this.getAttribute("origin") || defaultOrigin;
      var url = new URL("/embed", origin);
      var displayMode = this.getAttribute("display-mode");
      var autoPlay = this.optionalBoolean("autoplay");
      var gestures = this.optionalBoolean("gestures");
      var parentOrigin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "*";
      var pairs = {
        src: this.getAttribute("src"),
        type: this.getAttribute("type") || "auto",
        poster: this.getAttribute("poster"),
        title: this.getAttribute("title"),
        accent: this.getAttribute("accent"),
        thumbnails: this.getAttribute("thumbnails"),
        display: displayMode === "minimal" || displayMode === "default" ? displayMode : undefined,
        autoplay: autoPlay === undefined ? undefined : autoPlay ? "1" : "0",
        gestures: gestures === undefined ? undefined : gestures ? "1" : "0",
        parentOrigin: parentOrigin,
      };
      Object.keys(pairs).forEach(function (key) {
        var value = pairs[key];
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
      });
      this.playerOrigin = url.origin;
      this.ready = false;
      this.commandQueue = [];
      this.frame.src = url.toString();
      this.frame.title = this.getAttribute("title") || "Vela video player";
      this.frame.allow = "autoplay; fullscreen; picture-in-picture";
      this.frame.allowFullscreen = true;
      this.frame.loading = this.getAttribute("loading") === "eager" ? "eager" : "lazy";
    }

    postCommand(payload) {
      if (this.frame.contentWindow) {
        this.frame.contentWindow.postMessage({ type: "vela:command", command: payload.command, value: payload.value }, this.playerOrigin);
      }
    }

    onMessage(event) {
      if (event.source !== this.frame.contentWindow || event.origin !== this.playerOrigin || !event.data) return;
      if (event.data.type === "vela:ready") {
        this.ready = true;
        var queue = this.commandQueue.splice(0);
        queue.forEach(this.postCommand.bind(this));
        this.dispatchEvent(new CustomEvent("velaready"));
      }
      if (event.data.type === "vela:state") {
        this.state = event.data.state;
        this.dispatchEvent(new CustomEvent("velastate", { detail: this.state }));
      }
    }

    command(command, value) {
      var payload = { command: command, value: value };
      if (this.ready) this.postCommand(payload);
      else this.commandQueue.push(payload);
      return this;
    }

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
