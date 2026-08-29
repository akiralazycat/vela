# Vela player presentation split

`components/VelaPlayer.tsx` is now the public facade. Playback behavior remains isolated in `components/VelaPlayerCore.tsx` while presentation concerns move into small React components under this directory.

## Current boundary

- `PlayerFrame.tsx` owns the display preset boundary (`default` / `minimal`).
- `PlayerModeSwitch.tsx` owns the optional demo/editor switch.
- `PlayerPresentationContext.tsx` carries current playback state and presentation mode without prop drilling.
- `VelaPlayerCore.tsx` still owns transport, Shaka integration, settings markup, timeline markup, gestures, and imperative API behavior.

## Migration order

1. `Timeline` + `TimelinePreview`
2. `ControlDock` + `ActionDock`
3. `SettingsMenu`
4. `AudioSettings`
5. `SubtitleSettings` + accessibility preview
6. `LiveStatus` + DVR affordances
7. remove the temporary DOM presentation scripts from `app/layout.tsx`

The compatibility scripts stay enabled until their equivalent React component is landed. This keeps the current UX stable while the monolith is reduced incrementally.
