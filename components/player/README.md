# Vela player presentation split

`components/VelaPlayer.tsx` is the public facade. Playback behavior remains isolated in `components/VelaPlayerCore.tsx` while presentation concerns move into small React components under this directory.

## Current boundary

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`).
- `PlayerModeSwitch.tsx` owns the optional demo/editor switch.
- `PlayerPresentationContext.tsx` carries current playback state and presentation mode without prop drilling.
- `Timeline.tsx` owns seek geometry, chapter markers, DVR window context, pointer/touch scrubbing state, and the range input.
- `TimelinePreview.tsx` owns thumbnail VTT loading, sprite resolution, edge clamping, chapter-aware preview content, and live DVR preview labels.
- `ControlDock.tsx` owns transport chrome: play, volume, time/live affordance, captions, loop, and the settings trigger.
- `ActionDock.tsx` owns PiP and fullscreen actions while deliberately rendering without an extra DOM wrapper so the established top-right glass geometry remains stable.
- `SettingsMenu.tsx` owns progressive disclosure (`Quality` / `Speed` / `More settings`), nested settings navigation, loop access, and the settings-section presentation contract.
- `VelaPlayerCore.tsx` owns Shaka integration, playback state, gestures, and imperative API behavior, but no longer owns timeline, control/action dock, or settings presentation markup.

## Compatibility scripts

`public/vela-timeline-preview.js` and `public/vela-settings-layer.js` have been retired. Timeline preview and settings navigation are now React-owned. Audio, live, subtitle/accessibility, and playback-signal DOM bridges remain temporarily enabled until their equivalent React components land.

## Migration order

1. ~~`Timeline` + `TimelinePreview`~~
2. ~~`ControlDock` + `ActionDock`~~
3. ~~`SettingsMenu`~~
4. `AudioSettings`
5. `SubtitleSettings` + accessibility preview
6. `LiveStatus` + DVR affordances
7. remove the remaining temporary DOM presentation scripts from `app/layout.tsx`
