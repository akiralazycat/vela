# Vela Player

A quiet, high-end adaptive web video player with HLS/DASH playback, live DVR, multilingual media tracks, themeable controls, an embed SDK, and framework-neutral distribution.

## Prototype 03

Vela keeps the media engine and the viewing surface separate. Shaka Player owns adaptive playback and manifest semantics; Vela owns the interaction model, design system, state/API contract, and distribution layer.

### Playback

- HLS and MPEG-DASH with automatic source detection
- adaptive bitrate playback plus manual rendition selection such as 1080p / 720p
- multilingual audio-track discovery and selection
- manifest subtitle tracks plus external WebVTT tracks
- supplied or manifest-derived chapters with timeline markers and navigation
- live/DVR timeline based on the real seekable window, live latency, and Go Live control
- metadata indicators for HDR10, HLG, Dolby Vision, Dolby Audio/Atmos/spatial audio, and BT.2020 when selected tracks advertise those signals
- WebVTT + sprite-sheet timeline previews
- playback speed, looping, volume, Picture-in-Picture, fullscreen
- poster-first composition with lower-left primary play action

HDR/Dolby badges report stream/track metadata. They do not add codec support, transcoding, device capability, or Dolby certification.

### Input system

Desktop keyboard:

- `Space` / `K`: play or pause
- `←` / `→`: seek ±5 seconds
- `J` / `L`: seek ±10 seconds
- `↑` / `↓`: volume ±5%
- `M`: mute
- `C`: captions
- `F`: fullscreen
- `Home`: beginning of the seek window
- `End`: VOD end or live edge
- `<` / `>`: playback speed

Touch:

- double tap left/right: seek ±10 seconds
- double tap center: play/pause
- horizontal swipe: seek up to ±30 seconds

### Captions and design

Runtime theme tokens cover accent, surface, foreground, muted color, corner radius, blur, and control density. Subtitle styling adds:

- font scale
- foreground color
- background color/opacity
- no edge / shadow / outline
- sans / serif / mono families

The prototype page exposes a live Theme + Caption Builder and can copy its configuration as JSON.

## React API

```tsx
import { VelaPlayer } from "@vela/player/react";
import "@vela/player/styles.css";

<VelaPlayer
  src="https://cdn.example.com/manifest.mpd"
  sourceType="dash"
  poster="/poster.jpg"
  thumbnailVtt="/thumbnails.vtt"
  textTracks={[
    { src: "/en.vtt", language: "en", label: "English" },
    { src: "/ja.vtt", language: "ja", label: "日本語" },
  ]}
/>
```

The forwarded ref exposes:

- `play`, `pause`, `seek`
- `setVolume`, `setQuality`
- `setTextTrack`, `setAudioTrack`
- `setCaptionStyle`
- `goLive`
- `nextChapter`, `previousChapter`
- `getState`

## Browser / iframe SDK

```html
<div
  data-vela-player
  data-src="https://cdn.example.com/master.m3u8"
  data-type="hls"
  data-poster="https://cdn.example.com/poster.jpg"
  data-accent="#d8ff62"
></div>
<script src="https://vela.manabeakira.com/vela.js" defer></script>
```

```js
const player = Vela.mount("[data-vela-player]");
player.quality(1080);
player.audio("track-id");
player.captionStyle({ fontScale: 1.2, edge: "outline" });
player.live();
player.on("state", (state) => console.log(state));
```

The SDK renders `/embed` in an iframe and communicates through a small `postMessage` command/state bridge.

## Web Component

Without React at the integration layer:

```html
<script src="https://vela.manabeakira.com/vela-element.js" defer></script>

<vela-player
  src="https://cdn.example.com/master.m3u8"
  type="hls"
  title="Film"
  accent="#d8ff62">
</vela-player>
```

The custom element exposes player methods including `play()`, `pause()`, `seek()`, `setQuality()`, `setAudio()`, `setCaptionStyle()`, and `goLive()`.

## npm package workspace

`packages/vela-player` is prepared as `@vela/player` with three entry points:

- `@vela/player` — framework-neutral iframe controller
- `@vela/player/react` — React component and types
- `@vela/player/web-component` — `<vela-player>` custom element
- `@vela/player/styles.css` — player-only CSS

Build locally with:

```bash
npm install
npm run typecheck
npm run package:build
npm run build
```

The package is publish-ready in the repository but is intentionally **not published** by this project workflow. Publishing requires npm authentication and ownership of the selected package scope.

## Thumbnail VTT

Vela accepts standard sprite references:

```text
WEBVTT

00:00:00.000 --> 00:00:10.000
thumbs.jpg#xywh=0,0,320,180

00:00:10.000 --> 00:00:20.000
thumbs.jpg#xywh=320,0,320,180
```

Only the sprite asset is loaded; timeline movement selects the indexed crop instead of seeking a second video element.
