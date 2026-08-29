# Vela player presentation split

`components/VelaPlayer.tsx` is the public facade. Playback behavior remains isolated in `components/VelaPlayerCore.tsx` while presentation concerns live in small React components under this directory.

## Current boundary

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`) and mounts the contextual playback signal surface.
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
- `PlaybackSignals.tsx` owns contextual live / quality / audio / chapter / media signals, actual decoded-height tracking, and the quick Audio / Return-to-Live affordances.
- `VelaPlayerCore.tsx` owns Shaka integration, playback state, gestures, and imperative API behavior, but no longer owns the extracted presentation surfaces above.

## Presentation runtime

The presentation migration is complete. `public/vela-timeline-preview.js`, `public/vela-settings-layer.js`, `public/vela-audio-ux.js`, `public/vela-subtitle-ux.js`, `public/vela-live-ux.js`, and `public/vela-playback-signals.js` have all been retired. `app/layout.tsx` no longer loads presentation scripts; timeline preview, settings, multilingual audio, subtitles/accessibility, live DVR, and playback intelligence are React-owned.

The remaining CSS compatibility layers intentionally preserve the established selectors and visual geometry while component ownership is now explicit. They can be consolidated later without reintroducing DOM observers or runtime presentation scripts.

## Migration order

1. ~~`Timeline` + `TimelinePreview`~~
2. ~~`ControlDock` + `ActionDock`~~
3. ~~`SettingsMenu`~~
4. ~~`AudioSettings`~~
5. ~~`SubtitleSettings` + `AccessibilitySettings`~~
6. ~~`LiveStatus` + DVR affordances~~
7. ~~`PlaybackSignals` + remove presentation scripts from `app/layout.tsx`~~
