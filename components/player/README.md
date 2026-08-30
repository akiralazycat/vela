# Vela player architecture

`components/VelaPlayer.tsx` is the public facade. `components/VelaPlayerCore.tsx` now coordinates playback state and Shaka lifecycle while presentation and reusable core contracts live below `components/player`.

## Presentation ownership

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`) and mounts contextual playback signals.
- `PlayerModeSwitch.tsx` owns the optional demo/editor switch.
- `PlayerPresentationContext.tsx` carries current playback state and presentation mode without importing the playback implementation.
- `Timeline.tsx` owns seek geometry, chapter markers, DVR window context, pointer/touch scrubbing state, and the range input.
- `TimelinePreview.tsx` owns thumbnail VTT loading, sprite resolution, edge clamping, chapter-aware preview content, and live DVR preview labels.
- `ControlDock.tsx` owns transport chrome: play, volume, time/live affordance, captions, loop, and the settings trigger.
- `ActionDock.tsx` owns PiP and fullscreen actions.
- `SettingsMenu.tsx` owns progressive disclosure and nested settings navigation.
- `AudioSettings.tsx`, `SubtitleSettings.tsx`, and `AccessibilitySettings.tsx` own their respective track and caption surfaces.
- `LiveStatus.tsx` owns live-edge / behind-edge labeling, Go Live semantics, and return-to-live confirmation.
- `PlaybackSignals.tsx` owns contextual live / quality / audio / chapter / media signals and quick Audio / Return-to-Live affordances.
- `PlayerSurfaceChrome.tsx` owns the non-transport overlays: engine/media fallback badges, poster action, error surface, title, vignette, and gesture hint.

## Playback core

`VelaPlayerCore.tsx` is intentionally a coordinator rather than the type/style/gesture monolith it was before.

- `core/contracts.ts` is the stable public player contract (`VelaPlayerProps`, handle, state, theme, captions, chapters).
- `core/adaptive.ts` contains Shaka-facing structural types plus source detection, MIME selection, track identity/detail formatting, and media capability badges.
- `core/playerStyle.ts` owns default theme/caption values and maps them to CSS custom properties.
- `core/utils.ts` contains playback-agnostic time/clamp helpers.
- `useControlVisibility.ts` owns control auto-hide timing.
- `usePlayerGestures.ts` owns pointer/touch gesture interpretation and transient gesture feedback.

The remaining responsibility inside `VelaPlayerCore.tsx` is playback lifecycle/state coordination: loading Shaka/native media, selecting tracks/quality, live seek state, imperative API commands, keyboard routing, and wiring those values into the extracted React surfaces.

## Presentation runtime

The presentation migration is complete. `app/layout.tsx` loads no Vela presentation scripts and the former `public/vela-*-ux.js` / playback signal bridges are retired.

CSS now enters through `styles/player-presentation.css`. That file is a deliberate compatibility boundary: it preserves the proven cascade order of the older `*-v1.css` shards while `app/globals.css` has only the base player, presentation boundary, and site stylesheet imports. New styling should not add another phase stylesheet; the remaining shards can be folded into component-oriented CSS after visual regression QA.
