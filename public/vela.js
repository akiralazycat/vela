(function () {
  "use strict";

  var script = document.currentScript;
  var sdkUrl = script && script.src ? new URL(script.src) : new URL(window.location.href);
  var defaultOrigin = sdkUrl.origin;

  function optionalBoolean(value) {
    if (value === undefined) return undefined;
    return value !== "false" && value !== "0" && value !== "off";
  }

  function readDataset(element) {
    var displayMode = element.dataset.displayMode;
    return {
      src: element.dataset.src,
      type: element.dataset.type || "auto",
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

  function VelaEmbed(target, options) {
    if (typeof target === "string") target = document.querySelector(target);
    if (!target) throw new Error("Vela: mount target not found");

    this.target = target;
    this.options = Object.assign({}, readDataset(target), options || {});
    this.listeners = {};
    this.state = null;
    this.ready = false;
    this.commandQueue = [];

    var origin = this.options.origin || defaultOrigin;
    var url = new URL("/embed", origin);
    var parentOrigin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "*";
    var params = {
      src: this.options.src,
      type: this.options.type,
      poster: this.options.poster,
      title: this.options.title,
      accent: this.options.accent,
      thumbnails: this.options.thumbnails,
      display: this.options.displayMode,
      autoplay: this.options.autoPlay === undefined ? undefined : this.options.autoPlay ? "1" : "0",
      gestures: this.options.gestures === undefined ? undefined : this.options.gestures ? "1" : "0",
      parentOrigin: parentOrigin,
    };
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    });
    this.playerOrigin = url.origin;

    this.iframe = document.createElement("iframe");
    this.iframe.title = this.options.title || "Vela video player";
    this.iframe.allow = "autoplay; fullscreen; picture-in-picture";
    this.iframe.allowFullscreen = true;
    this.iframe.loading = this.options.loading || "lazy";
    this.iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#080908";

    this._onMessage = this._onMessage.bind(this);
    window.addEventListener("message", this._onMessage);
    this.iframe.src = url.toString();
    target.replaceChildren(this.iframe);
  }

  VelaEmbed.prototype._postCommand = function (payload) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: "vela:command", command: payload.command, value: payload.value }, this.playerOrigin);
    }
  };

  VelaEmbed.prototype._onMessage = function (event) {
    if (event.source !== this.iframe.contentWindow || event.origin !== this.playerOrigin || !event.data) return;
    if (event.data.type === "vela:ready") {
      this.ready = true;
      var queue = this.commandQueue.splice(0);
      queue.forEach(this._postCommand.bind(this));
      this._emit("ready", null);
    }
    if (event.data.type === "vela:state") {
      this.state = event.data.state;
      this._emit("state", this.state);
    }
  };

  VelaEmbed.prototype._emit = function (name, payload) {
    (this.listeners[name] || []).slice().forEach(function (listener) { listener(payload); });
  };

  VelaEmbed.prototype.on = function (name, listener) {
    (this.listeners[name] || (this.listeners[name] = [])).push(listener);
    return this;
  };

  VelaEmbed.prototype.off = function (name, listener) {
    var listeners = this.listeners[name] || [];
    this.listeners[name] = listeners.filter(function (candidate) { return candidate !== listener; });
    return this;
  };

  VelaEmbed.prototype.command = function (command, value) {
    var payload = { command: command, value: value };
    if (this.ready) this._postCommand(payload);
    else this.commandQueue.push(payload);
    return this;
  };

  VelaEmbed.prototype.play = function () { return this.command("play"); };
  VelaEmbed.prototype.pause = function () { return this.command("pause"); };
  VelaEmbed.prototype.seek = function (seconds) { return this.command("seek", seconds); };
  VelaEmbed.prototype.volume = function (value) { return this.command("volume", value); };
  VelaEmbed.prototype.quality = function (value) { return this.command("quality", value); };
  VelaEmbed.prototype.captions = function (value) { return this.command("captions", value); };
  VelaEmbed.prototype.audio = function (value) { return this.command("audio", value); };
  VelaEmbed.prototype.captionStyle = function (value) { return this.command("captionStyle", value); };
  VelaEmbed.prototype.live = function () { return this.command("live"); };
  VelaEmbed.prototype.nextChapter = function () { return this.command("nextChapter"); };
  VelaEmbed.prototype.previousChapter = function () { return this.command("previousChapter"); };
  VelaEmbed.prototype.getState = function () { return this.state; };
  VelaEmbed.prototype.destroy = function () {
    window.removeEventListener("message", this._onMessage);
    this.ready = false;
    this.commandQueue = [];
    this.listeners = {};
    this.target.replaceChildren();
  };

  var Vela = {
    version: "0.3.0",
    mount: function (target, options) { return new VelaEmbed(target, options); },
  };

  window.Vela = Vela;

  function autoMount() {
    document.querySelectorAll("[data-vela-player]").forEach(function (element) {
      if (!element.__vela) element.__vela = Vela.mount(element);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount);
  else autoMount();
})();
