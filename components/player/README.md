# Vela player architecture

`components/VelaPlayer.tsx` is the public facade. `components/VelaPlayerCore.tsx` is now a thin wiring layer: engine lifecycle, direct `HTMLMediaElement` operations, command routing, imperative API composition, and presentation all live behind explicit boundaries under `components/player`.

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

- `usePlaybackEngine.ts` is the engine facade shared by HLS/DASH and native media. It resolves source type, normalizes text tracks, resets source-scoped engine state, owns load/error/ready lifecycle state, exposes quality/text/audio selection, and keeps live/track snapshots synchronized.
- `useAdaptivePlaybackEngine.ts` is the Shaka-specific adapter. It dynamically loads Shaka, checks browser support, owns the `AdaptivePlayer` instance, attaches/loads manifests, adds external text tracks, listens for track/manifest changes, resolves manifest chapters, and disposes safely when a source changes or unmounts.
- Native MP4 loading remains in `usePlaybackEngine.ts`, using the same lifecycle contract without introducing a second UI state model.
- An `AbortController` gates async adaptive work so a superseded source cannot write stale track/live/chapter state after cleanup.

## Media control boundary

Direct `HTMLMediaElement` transport state and commands live in `useMediaControls.ts`.

- Owns `playing`, `started`, `currentTime`, `duration`, `buffered`, `volume`, `muted`, `speed`, and `loop` UI-facing state.
- Owns play/pause/toggle, seek/seekBy, volume/mute, playback rate, loop application, and Go Live seeking.
- Owns media event synchronization (`play`, `pause`, `loadedmetadata`, `durationchange`, `timeupdate`, `progress`).
- Resets session-scoped transport state from the engine-provided `sessionKey`, while preserving user-level volume/speed/loop preferences across source changes as before.
- Uses the adaptive player only for live seek bounds; the playback engine remains responsible for loading and track selection.

## Controller boundary

Cross-boundary command composition now lives in `usePlayerController.ts`.

- Derives the active chapter and owns next/previous chapter navigation.
- Composes the stable `VelaPlayerHandle` imperative API from engine and media actions.
- Owns keyboard command routing, including input/content-editable guards, transport shortcuts, volume, captions, loop, fullscreen, Home/End, and playback-rate shortcuts.
- Owns PiP/fullscreen commands and caption toggle composition.
- Produces the public `VelaPlayerState` snapshot and emits `onStateChange`, keeping that contract out of the render/wiring component.

`VelaPlayerCore.tsx` now keeps only state that is genuinely local to the assembled React surface (`captionStyleState`, settings-open state, theme/style composition, timeline-derived geometry) and wires engine/media/controller outputs into the extracted components. Stage 7 intentionally stops here; no additional controller micro-hooks are planned.

## Core modules

- `core/contracts.ts` is the stable player contract (`VelaPlayerProps`, handle, state, theme, captions, chapters) plus the internal load-status union shared by engine and chrome.
- `core/adaptive.ts` contains Shaka-facing structural types plus source detection, MIME selection, track identity/detail formatting, and media capability badges.
- `core/playerStyle.ts` owns default theme/caption values and maps them to CSS custom properties.
- `core/utils.ts` contains playback-agnostic time/clamp helpers.
- `useControlVisibility.ts` owns control auto-hide timing.
- `usePlayerGestures.ts` owns pointer/touch gesture interpretation and transient gesture feedback.

## Refactor completion gate

This refactor has a fixed eight-stage finish line. Do not keep splitting indefinitely after stage 8 unless QA exposes a concrete ownership problem.

1. React presentation component extraction — complete.
2. Remove DOM-enhancement presentation scripts — complete.
3. Establish a single CSS compatibility boundary — complete.
4. Split public contracts, adaptive helpers, style mapping, gestures, and control visibility — complete.
5. Split Shaka/native loading into `usePlaybackEngine` + `useAdaptivePlaybackEngine` — complete.
6. Split direct media transport operations into `useMediaControls` — complete.
7. Final controller cleanup — complete: keyboard routing, imperative API/state snapshot composition, chapter commands, PiP/fullscreen, and caption-toggle orchestration are isolated in `usePlayerController`.
8. Consolidate legacy CSS shards by component, run visual/interaction regression across VOD/live/mobile/default/minimal, verify site/embed/package parity, and freeze the architecture.

By stage count the refactor is **7 / 8 complete (87.5%)**. Weighted by remaining work, the practical completion estimate after stage 7 is **about 88%** because stage 8 is deliberately the larger integration/regression gate rather than another extraction step.

## Presentation runtime

The presentation migration is complete. `app/layout.tsx` loads no Vela presentation scripts and the former `public/vela-*-ux.js` / playback signal bridges are retired.

CSS enters through `styles/player-presentation.css`. That file is a deliberate compatibility boundary: it preserves the proven cascade order of the older `*-v1.css` shards while `app/globals.css` has only the base player, presentation boundary, and site stylesheet imports. New styling should not add another phase stylesheet. Stage 8 folds the remaining shards into component-oriented CSS, verifies regressions/parity, and freezes this architecture.
