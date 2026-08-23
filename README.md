# Vela Player

A minimal, high-end adaptive web video player built with Next.js and React.

## Prototype 02

Vela now separates the streaming engine from the viewing surface. Shaka Player handles adaptive media; Vela owns the interaction model, design system, theme layer, and embedding API.

### Playback

- HLS and MPEG-DASH with automatic source detection
- adaptive bitrate playback plus manual rendition selection such as 1080p / 720p
- MP4 fallback
- manifest subtitle tracks plus external WebVTT tracks
- WebVTT + sprite-sheet timeline previews
- playback speed, looping, volume, Picture-in-Picture, fullscreen
- keyboard shortcuts (`Space`/`K`, arrows, `M`, `C`, `L`, `F`)
- poster-first composition with lower-left primary play action

### Design

- runtime theme tokens for accent, surface, foreground, muted color, radius, blur, and control density
- built-in theme builder on the prototype page
- responsive desktop/mobile control treatment

### Embedding

Vela exposes both a React ref API and a lightweight iframe/browser SDK.

```html
<div
  data-vela-player
  data-src="https://cdn.example.com/master.m3u8"
  data-type="hls"
  data-poster="https://cdn.example.com/poster.jpg"
  data-accent="#d8ff62"
></div>
<script src="https://your-vela-host.example/vela.js" defer></script>
```

Programmatic control:

```js
const player = Vela.mount("[data-vela-player]");

player.play();
player.pause();
player.seek(42);
player.volume(0.7);
player.quality("auto");
player.quality(1080);
player.captions("off");
player.on("state", (state) => console.log(state));
```

The SDK renders `/embed` in an iframe and communicates through a small `postMessage` command/state bridge.

## React component

```tsx
import { VelaPlayer } from "@/components/VelaPlayer";

<VelaPlayer
  src="https://cdn.example.com/manifest.mpd"
  sourceType="dash"
  poster="/poster.jpg"
  thumbnailVtt="/thumbnails.vtt"
  textTracks={[
    { src: "/en.vtt", language: "en", label: "English" },
    { src: "/ja.vtt", language: "ja", label: "日本語" },
  ]}
  theme={{
    accent: "#d8ff62",
    radius: 12,
    blur: 20,
  }}
/>
```

The forwarded ref exposes `play`, `pause`, `seek`, `setVolume`, `setQuality`, `setTextTrack`, and `getState`.

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

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

The prototype site uses public Shaka demo manifests to exercise real HLS/DASH rendition and multilingual track discovery. GitHub Actions runs both the TypeScript check and the production Next.js build for prototype changes.
