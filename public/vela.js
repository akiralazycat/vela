(function () {
  "use strict";

  var script = document.currentScript;
  var sdkUrl = script && script.src ? new URL(script.src) : new URL(window.location.href);
  var defaultOrigin = sdkUrl.origin;

  function readDataset(element) {
    return {
      src: element.dataset.src,
      type: element.dataset.type || "auto",
      poster: element.dataset.poster,
      title: element.dataset.title,
      accent: element.dataset.accent,
      thumbnails: element.dataset.thumbnails,
    };
  }

  function VelaEmbed(target, options) {
    if (typeof target === "string") target = document.querySelector(target);
    if (!target) throw new Error("Vela: mount target not found");

    this.target = target;
    this.options = Object.assign({}, readDataset(target), options || {});
    this.listeners = {};
    this.state = null;

    var origin = this.options.origin || defaultOrigin;
    var url = new URL("/embed", origin);
    ["src", "type", "poster", "title", "accent", "thumbnails"].forEach(function (key) {
      if (this.options[key] !== undefined && this.options[key] !== "") url.searchParams.set(key, this.options[key]);
    }, this);

    this.iframe = document.createElement("iframe");
    this.iframe.src = url.toString();
    this.iframe.title = this.options.title || "Vela video player";
    this.iframe.allow = "autoplay; fullscreen; picture-in-picture";
    this.iframe.allowFullscreen = true;
    this.iframe.loading = this.options.loading || "lazy";
    this.iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#080908";
    target.replaceChildren(this.iframe);

    this._onMessage = this._onMessage.bind(this);
    window.addEventListener("message", this._onMessage);
  }

  VelaEmbed.prototype._onMessage = function (event) {
    if (event.source !== this.iframe.contentWindow || !event.data) return;
    if (event.data.type === "vela:ready") this._emit("ready", null);
    if (event.data.type === "vela:state") {
      this.state = event.data.state;
      this._emit("state", this.state);
    }
  };

  VelaEmbed.prototype._emit = function (name, payload) {
    (this.listeners[name] || []).forEach(function (listener) { listener(payload); });
  };

  VelaEmbed.prototype.on = function (name, listener) {
    (this.listeners[name] || (this.listeners[name] = [])).push(listener);
    return this;
  };

  VelaEmbed.prototype.command = function (command, value) {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: "vela:command", command: command, value: value }, "*");
    }
    return this;
  };

  VelaEmbed.prototype.play = function () { return this.command("play"); };
  VelaEmbed.prototype.pause = function () { return this.command("pause"); };
  VelaEmbed.prototype.seek = function (seconds) { return this.command("seek", seconds); };
  VelaEmbed.prototype.volume = function (value) { return this.command("volume", value); };
  VelaEmbed.prototype.quality = function (value) { return this.command("quality", value); };
  VelaEmbed.prototype.captions = function (value) { return this.command("captions", value); };
  VelaEmbed.prototype.getState = function () { return this.state; };
  VelaEmbed.prototype.destroy = function () {
    window.removeEventListener("message", this._onMessage);
    this.target.replaceChildren();
  };

  var Vela = {
    version: "0.2.0",
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
