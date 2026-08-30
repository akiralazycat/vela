# Vela product quality finish line

Architecture is frozen. Product-quality work now uses three finite gates; it does not reopen architecture unless a concrete defect requires it.

1. **Surface contract + release polish** — theme semantics, public labels/copy, failure-safe demo actions, accessibility smoke checks.
2. **Playback regression matrix** — VOD HLS/DASH/MP4, live/DVR, captions/audio/chapters, keyboard/touch, Default/Minimal, mobile/coarse-pointer behavior.
3. **Distribution parity** — site, `/embed`, React package stylesheet/API, framework-neutral controller, Web Component, package build/publish surface.

A gate is complete only when defects found in that gate are fixed and the exact resulting tree passes the available production build/runtime checks. After gate 3, Vela moves to issue-driven maintenance rather than open-ended polish.
