# @vela/player

Vela's framework-neutral controller, React component and Web Component distribution package.

## Build

```bash
npm run package:build
```

The package produces ESM/CJS bundles, declarations, and `dist/styles.css`. The stylesheet contains both the base player rules and the complete React presentation cascade used by the site/embed surface, so package consumers do not receive a reduced visual shell.

The repository production build runs the package build first. A deploy therefore verifies the package entry points and the site/embed application from the same tree.

## Framework-neutral controller

```ts
import { Vela } from "@vela/player";

const player = Vela.mount("#video", {
  src: "https://cdn.example.com/master.m3u8",
  type: "hls",
  origin: "https://vela.manabeakira.com",
  displayMode: "default",
  autoPlay: false,
  gestures: true,
});

player.quality(1080);
player.audio("track-id");
player.captionStyle({ fontScale: 1.2, edge: "outline" });
player.live();
```

Commands issued before the iframe reports `vela:ready` are queued and replayed in order. The controller also pins `postMessage` traffic to the resolved Vela embed origin and passes the host page origin into `/embed`, avoiding wildcard messaging for normal HTTP(S) integrations.

## React

```tsx
import { VelaPlayer } from "@vela/player/react";
import "@vela/player/styles.css";

<VelaPlayer src={manifest} sourceType="dash" displayMode="default" />
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
  display-mode="default"
  gestures="true"
></vela-player>
```

The custom element observes `src`, `type`, `poster`, `title`, `accent`, `thumbnails`, `origin`, `loading`, `display-mode`, `autoplay`, and `gestures`. It exposes `play()`, `pause()`, `seek()`, `setVolume()`, `setQuality()`, `setCaptions()`, `setAudio()`, `setCaptionStyle()`, `goLive()`, `nextChapter()`, `previousChapter()`, and `getState()`.

The Web Component entry is safe to import during SSR; registration only occurs when a browser `customElements` registry exists.

> The package is publish-ready, but publishing requires access to the configured npm scope.
