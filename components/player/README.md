# Vela player architecture

`components/VelaPlayer.tsx` is the public facade. `components/VelaPlayerCore.tsx` is a thin wiring layer: engine lifecycle, direct `HTMLMediaElement` operations, command routing, imperative API composition, and presentation all live behind explicit boundaries under `components/player`.

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

The media-loading lifecycle does not live in `VelaPlayerCore.tsx`.

- `usePlaybackEngine.ts` is the engine facade shared by HLS/DASH and native media. It resolves source type, normalizes text tracks, resets source-scoped engine state, owns load/error/ready lifecycle state, exposes quality/text/audio selection, and keeps live/track snapshots synchronized.
- `useAdaptivePlaybackEngine.ts` is the Shaka-specific adapter. It dynamically loads Shaka, checks browser support, owns the `AdaptivePlayer` instance, attaches/loads manifests, adds external text tracks, listens for track/manifest changes, resolves manifest chapters, and disposes safely when a source changes or unmounts.
- Native MP4 loading remains in `usePlaybackEngine.ts`, using the same lifecycle contract without introducing a second UI state model.
- An `AbortController` gates async adaptive work so a superseded source cannot write stale track/live/chapter state after cleanup.

## Media control boundary

Direct `HTMLMediaElement` transport state and commands live in `useMediaControls.ts`.

- Owns `playing`, `started`, `currentTime`, `duration`, `buffered`, `volume`, `muted`, `speed`, and `loop` UI-facing state.
- Owns play/pause/toggle, seek/seekBy, volume/mute, playback rate, loop application, and Go Live seeking.
- Owns media event synchronization (`play`, `pause`, `loadedmetadata`, `durationchange`, `timeupdate`, `progress`).
- Resets session-scoped transport state from the engine-provided `sessionKey`, while preserving user-level volume/speed/loop preferences across source changes.
- Uses the adaptive player only for live seek bounds; the playback engine remains responsible for loading and track selection.

## Controller boundary

Cross-boundary command composition lives in `usePlayerController.ts`.

- Derives the active chapter and owns next/previous chapter navigation.
- Composes the stable `VelaPlayerHandle` imperative API from engine and media actions.
- Owns keyboard command routing, including input/content-editable guards, transport shortcuts, volume, captions, loop, fullscreen, Home/End, and playback-rate shortcuts.
- Owns PiP/fullscreen commands and caption toggle composition.
- Produces the public `VelaPlayerState` snapshot and emits `onStateChange`, keeping that contract out of the render/wiring component.

`VelaPlayerCore.tsx` keeps only state that is genuinely local to the assembled React surface (`captionStyleState`, settings-open state, theme/style composition, timeline-derived geometry) and wires engine/media/controller outputs into the extracted components. No additional controller micro-hooks are planned unless a concrete ownership defect appears.

## Core modules

- `core/contracts.ts` is the stable player contract (`VelaPlayerProps`, handle, state, theme, captions, chapters) plus the internal load-status union shared by engine and chrome.
- `core/adaptive.ts` contains Shaka-facing structural types plus source detection, MIME selection, track identity/detail formatting, and media capability badges.
- `core/playerStyle.ts` owns default theme/caption values and maps them to CSS custom properties.
- `core/utils.ts` contains playback-agnostic time/clamp helpers.
- `useControlVisibility.ts` owns control auto-hide timing.
- `usePlayerGestures.ts` owns pointer/touch gesture interpretation and transient gesture feedback.

## Presentation CSS

`app/globals.css` imports only the base player, `styles/player-presentation.css`, and site CSS. `player-presentation.css` is the canonical ordered presentation manifest. The historical `*-v1.css` phase filenames are retired and replaced by stable surface names:

1. `player-shell.css`
2. `settings.css`
3. `timeline.css`
4. `responsive.css`
5. `display-modes.css`
6. `playback-signals.css`
7. `audio-settings.css`
8. `live-status.css`
9. `timeline-live.css`
10. `subtitle-accessibility.css`

The order above intentionally matches the proven pre-freeze cascade byte-for-byte at the rule level. Renaming the files does not move rules across the cascade, which is the primary visual-regression safeguard for the Stage 8 consolidation.

The package build concatenates `player.css` plus those ten presentation sheets in the same order into `@vela/player/styles.css`. Site, embed, and React package consumers therefore share the same base/presentation rules instead of the package receiving only the old base stylesheet.

## Stage 8 regression matrix

Source-level integration checks at the architecture freeze boundary:

- VOD / Default: full ControlDock, ActionDock, timeline preview, layered settings, playback signals, audio/subtitle/accessibility surfaces remain in the canonical cascade.
- Live / Default: `LiveStatus`, DVR timeline context, live preview overrides, signal-rail return-to-live action, and live confirmation remain ordered with `timeline-live.css` after `live-status.css`.
- Mobile / coarse pointer: safe-area controls, hardware-volume simplification, enlarged touch targets, scrubbing-only preview visibility, compact settings, and narrow-screen timeline offsets remain in `responsive.css` at the original cascade position.
- Minimal: nonessential diagnostics/settings/audio chrome remain hidden while play, seek timeline, fullscreen, and the live recovery affordance remain reachable.
- Embed: `VelaEmbedClient` still mounts the same public `VelaPlayer` facade and forwards the same imperative/state contract.
- Package: `@vela/player/react` still re-exports the public facade; `@vela/player/styles.css` now includes the complete site presentation cascade.
- Web Component: the custom element continues to wrap the iframe/controller path and exposes the same transport/quality/caption/audio/live/chapter methods.

Preview deployments are intentionally disabled outside `main`; Stage 8 therefore avoids creating a non-production deployment solely for QA. The CSS rename is cascade-equivalent by construction, and no interaction component implementation is changed in this stage. Final production runtime acceptance belongs to the next intentional `main` deployment rather than to another refactor stage.

## Refactor completion gate

The architecture refactor has a fixed eight-stage finish line and is now frozen.

1. React presentation component extraction — complete.
2. Remove DOM-enhancement presentation scripts — complete.
3. Establish a single CSS compatibility boundary — complete.
4. Split public contracts, adaptive helpers, style mapping, gestures, and control visibility — complete.
5. Split Shaka/native loading into `usePlaybackEngine` + `useAdaptivePlaybackEngine` — complete.
6. Split direct media transport operations into `useMediaControls` — complete.
7. Final controller cleanup — complete.
8. Retire phase CSS names, preserve the presentation cascade under component-oriented names, verify VOD/live/mobile/default/minimal source contracts, restore site/embed/package style parity, and freeze the architecture — complete.

**Architecture refactor: 8 / 8 complete (100%).** Further work should be product behavior, visual polish, performance, accessibility, or a concrete bug fix—not decomposition for its own sake.
