# Vela player architecture

`components/VelaPlayer.tsx` is the public facade. `components/VelaPlayerCore.tsx` is now a thin playback controller: it coordinates UI-facing media state and commands while engine lifecycle, presentation, and reusable contracts live below `components/player`.

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

## Playback engine boundary

The media-loading lifecycle no longer lives in `VelaPlayerCore.tsx`.

- `usePlaybackEngine.ts` is the engine facade shared by HLS/DASH and native media. It resolves source type, normalizes text tracks, resets source-scoped state, owns load/error/ready lifecycle state, exposes quality/text/audio selection, and keeps live/track snapshots synchronized.
- `useAdaptivePlaybackEngine.ts` is the Shaka-specific adapter. It dynamically loads Shaka, checks browser support, owns the `AdaptivePlayer` instance, attaches/loads manifests, adds external text tracks, listens for track/manifest changes, resolves manifest chapters, and disposes safely when a source changes or unmounts.
- Native MP4 loading remains in `usePlaybackEngine.ts`, using the same lifecycle contract without introducing a second UI state model.
- An `AbortController` gates async adaptive work so a superseded source cannot write stale track/live/chapter state after cleanup.

## Core modules

- `core/contracts.ts` is the stable player contract (`VelaPlayerProps`, handle, state, theme, captions, chapters) plus the internal load-status union shared by engine and chrome.
- `core/adaptive.ts` contains Shaka-facing structural types plus source detection, MIME selection, track identity/detail formatting, and media capability badges.
- `core/playerStyle.ts` owns default theme/caption values and maps them to CSS custom properties.
- `core/utils.ts` contains playback-agnostic time/clamp helpers.
- `useControlVisibility.ts` owns control auto-hide timing.
- `usePlayerGestures.ts` owns pointer/touch gesture interpretation and transient gesture feedback.

`VelaPlayerCore.tsx` now keeps only controller responsibilities that need both engine state and the rendered media element: current time/duration/buffered state, volume/speed/loop, caption-style state, seek/go-live/chapter commands, keyboard routing, PiP/fullscreen, imperative API wiring, and passing state/actions into the extracted React surfaces.

## Presentation runtime

The presentation migration is complete. `app/layout.tsx` loads no Vela presentation scripts and the former `public/vela-*-ux.js` / playback signal bridges are retired.

CSS enters through `styles/player-presentation.css`. That file is a deliberate compatibility boundary: it preserves the proven cascade order of the older `*-v1.css` shards while `app/globals.css` has only the base player, presentation boundary, and site stylesheet imports. New styling should not add another phase stylesheet; the remaining shards can be folded into component-oriented CSS after visual regression QA.
