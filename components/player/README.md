# Vela player presentation split

`components/VelaPlayer.tsx` is the public facade. Playback behavior remains isolated in `components/VelaPlayerCore.tsx` while presentation concerns move into small React components under this directory.

## Current boundary

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`).
- `PlayerModeSwitch.tsx` owns the optional demo/editor switch.
- `PlayerPresentationContext.tsx` carries current playback state and presentation mode without prop drilling.
- `Timeline.tsx` now owns seek geometry, chapter markers, DVR window context, pointer/touch scrubbing state, and the range input.
- `TimelinePreview.tsx` now owns thumbnail VTT loading, sprite resolution, edge clamping, chapter-aware preview content, and live DVR preview labels.
- `VelaPlayerCore.tsx` still owns transport, Shaka integration, settings markup, gestures, and imperative API behavior, but no longer owns timeline presentation state or thumbnail-preview loading.

## Compatibility scripts

`public/vela-timeline-preview.js` has been retired. Its former responsibilities now live in React state and effects inside `Timeline` / `TimelinePreview`. The remaining DOM presentation scripts stay enabled until their equivalent React component lands.

## Migration order

1. ~~`Timeline` + `TimelinePreview`~~
2. `ControlDock` + `ActionDock`
3. `SettingsMenu`
4. `AudioSettings`
5. `SubtitleSettings` + accessibility preview
6. `LiveStatus` + DVR affordances
7. remove the remaining temporary DOM presentation scripts from `app/layout.tsx`
