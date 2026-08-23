# Vela Player

A minimal, high-end web video player prototype built with Next.js and React.

## Prototype goals

- poster-first composition with the primary play action in the lower-left
- custom transport chrome that recedes during playback
- real-frame scrub previews using a lightweight secondary video element
- volume, captions, playback speed, looping, Picture-in-Picture, and fullscreen controls
- keyboard shortcuts (`Space`/`K`, arrows, `M`, `C`, `L`, `F`)
- configurable accent color through the reusable `VelaPlayer` component
- responsive touch-friendly layout

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Component

The prototype player lives at `components/VelaPlayer.tsx` and currently accepts:

- `src`
- `poster`
- `title`
- `eyebrow`
- `accent`
- `captionsSrc`

The next production step is to replace the preview-video technique with generated sprite/VTT previews, add multi-source/HLS quality selection, and package the player as an embeddable library.
