# @vela/player

Vela's framework-neutral controller, React component and Web Component distribution package.

## Build

```bash
npm run package:build
```

The package produces ESM/CJS bundles, declarations, and `dist/styles.css`. The stylesheet contains both the base player rules and the complete React presentation cascade used by the site/embed surface, so package consumers do not receive a reduced visual shell.

## Framework-neutral controller

```ts
import { Vela } from "@vela/player";

const player = Vela.mount("#video", {
  src: "https://cdn.example.com/master.m3u8",
  type: "hls",
  origin: "https://vela.manabeakira.com",
});

player.quality(1080);
player.audio("track-id");
player.captionStyle({ fontScale: 1.2, edge: "outline" });
player.live();
```

## React

```tsx
import { VelaPlayer } from "@vela/player/react";
import "@vela/player/styles.css";

<VelaPlayer src={manifest} sourceType="dash" />
```

## Web Component

```js
import "@vela/player/web-component";
```

```html
<vela-player
  src="https://cdn.example.com/master.m3u8"
  type="hls"
  title="Film"
  accent="#d8ff62"
></vela-player>
```

The custom element exposes `play()`, `pause()`, `seek()`, `setVolume()`, `setQuality()`, `setCaptions()`, `setAudio()`, `setCaptionStyle()`, `goLive()`, `nextChapter()`, `previousChapter()`, and `getState()`.

> The package is publish-ready, but publishing requires access to the configured npm scope.
