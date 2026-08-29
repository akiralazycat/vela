# Vela player presentation split

`components/VelaPlayer.tsx` is the public facade. Playback behavior remains isolated in `components/VelaPlayerCore.tsx` while presentation concerns move into small React components under this directory.

## Current boundary

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`).
- `PlayerModeSwitch.tsx` owns the optional demo/editor switch.
- `PlayerPresentationContext.tsx` carries current playback state and presentation mode without prop drilling.
- `Timeline.tsx` owns seek geometry, chapter markers, DVR window context, pointer/touch scrubbing state, and the range input.
- `TimelinePreview.tsx` owns thumbnail VTT loading, sprite resolution, edge clamping, chapter-aware preview content, and live DVR preview labels.
- `ControlDock.tsx` owns transport chrome: play, volume, time/live affordance, captions, loop, and the settings trigger. Caption toggle status and the compact language tag are React-owned here.
- `ActionDock.tsx` owns PiP and fullscreen actions while deliberately rendering without an extra DOM wrapper so the established top-right glass geometry remains stable.
- `SettingsMenu.tsx` owns progressive disclosure (`Quality` / `Speed` / `More settings`), nested settings navigation, loop access, and the settings-section presentation contract.
- `AudioSettings.tsx` owns multilingual audio labeling, language/mix/role metadata, track summary, selection state, and the audio-switch confirmation surface.
- `SubtitleSettings.tsx` owns subtitle language naming, type metadata (`Subtitles` / `CC` / `SDH` / `Forced` when inferable), track summary, active-track presentation, and language-switch confirmation.
- `AccessibilitySettings.tsx` owns caption preview, Default / Contrast / Large presets, and size / edge / background controls.
- `LiveStatus.tsx` owns live-edge / behind-edge labeling, Go Live semantics, accessible status text, and the return-to-live confirmation surface.
- `VelaPlayerCore.tsx` owns Shaka integration, playback state, gestures, and imperative API behavior, but no longer owns timeline, control/action dock, settings, audio, subtitle, accessibility, or live-status presentation markup.

## Compatibility scripts

`public/vela-timeline-preview.js`, `public/vela-settings-layer.js`, `public/vela-audio-ux.js`, `public/vela-subtitle-ux.js`, and `public/vela-live-ux.js` have been retired. Timeline preview, DVR context, settings navigation, multilingual audio, subtitles, caption accessibility, and live-status presentation are now React-owned. Only the playback-signal bridge remains temporarily enabled; it still owns the contextual signal rail and routes its interactive Audio and DVR chips into the React UI.

## Migration order

1. ~~`Timeline` + `TimelinePreview`~~
2. ~~`ControlDock` + `ActionDock`~~
3. ~~`SettingsMenu`~~
4. ~~`AudioSettings`~~
5. ~~`SubtitleSettings` + `AccessibilitySettings`~~
6. ~~`LiveStatus` + DVR affordances~~
7. remove the remaining temporary playback-signal DOM bridge from `app/layout.tsx`
