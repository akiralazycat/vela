# Stage 8 architecture freeze

The Vela player architecture is frozen after the eight-stage React/presentation refactor.

## Acceptance boundary

- Presentation behavior is React-owned; no DOM-enhancement presentation scripts are loaded by `app/layout.tsx`.
- `VelaPlayerCore.tsx` is a wiring layer over `usePlaybackEngine`, `useAdaptivePlaybackEngine`, `useMediaControls`, `usePlayerController`, presentation components, and stable contracts.
- Historical `*-v1.css` filenames are retired. `styles/player-presentation.css` defines the canonical ordered presentation cascade under component-oriented filenames.
- The renamed CSS files reuse the exact previous rule blobs and preserve their exact import order; Stage 8 does not alter visual declarations or interaction component code.
- `@vela/player/styles.css` is built from `player.css` plus the full canonical presentation sequence, closing the previous package/site style-parity gap.
- Site and iframe embed both use the same public `VelaPlayer` React facade; the Web Component continues through the iframe/controller contract.

## Regression matrix

| Surface | Acceptance contract |
| --- | --- |
| VOD / Default | ControlDock, ActionDock, timeline preview, layered settings, playback signals, audio/subtitle/accessibility remain present. |
| Live / Default | LiveStatus, DVR context, live preview override, Return to Live action and confirmation remain present. |
| Mobile / coarse pointer | safe-area placement, touch targets, hardware-volume simplification, scrub-only preview and compact settings remain present. |
| Minimal | secondary chrome is hidden while play, seek, fullscreen and live recovery remain reachable. |
| Site | `player.css` + canonical `player-presentation.css` + site styles. |
| Embed | same `VelaPlayer` facade and imperative/state contract as site. |
| React package | same public facade; exported styles now include the full site player cascade. |
| Web Component | iframe/controller methods remain unchanged. |

Non-production Vercel deployments are intentionally disabled. The branch therefore does not create a preview deployment solely for Stage 8. Production runtime acceptance should be performed on the next intentional `main` deployment; that is a release validation step, not another architecture-refactor stage.

**Architecture refactor completion: 8 / 8 (100%).**
