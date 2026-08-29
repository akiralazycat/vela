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
- `AudioSettings.tsx` owns multilingual audio labeling, language/mix/role metadata, track summary, selection state, and the audio-switch confirmation surface.
- `VelaPlayerCore.tsx` owns Shaka integration, playback state, gestures, and imperative API behavior, but no longer owns timeline, control/action dock, settings, or audio presentation markup.

## Compatibility scripts

`public/vela-timeline-preview.js`, `public/vela-settings-layer.js`, and `public/vela-audio-ux.js` have been retired. Timeline preview, settings navigation, and multilingual audio presentation are now React-owned. Live, subtitle/accessibility, and playback-signal DOM bridges remain temporarily enabled until their equivalent React components land. The playback-signal bridge still owns the signal rail itself and routes the audio signal chip into the React settings hierarchy.

## Migration order

1. ~~`Timeline` + `TimelinePreview`~~
2. ~~`ControlDock` + `ActionDock`~~
3. ~~`SettingsMenu`~~
4. ~~`AudioSettings`~~
5. `SubtitleSettings` + accessibility preview
6. `LiveStatus` + DVR affordances
7. remove the remaining temporary DOM presentation scripts from `app/layout.tsx`
