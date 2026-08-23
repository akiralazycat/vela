import { VelaStudio } from "@/components/VelaStudio";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Vela home">
          <span className="wordmark-mark" aria-hidden="true">◒</span>
          VELA
        </a>
        <span className="build-label">PLAYER / PROTOTYPE 03</span>
      </header>

      <section className="hero hero-v3" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A complete playback surface</p>
          <h1>Video, without<br />the chrome.</h1>
          <p className="lede">
            Adaptive video, multilingual audio, live DVR and accessibility controls underneath.
            A deliberately quiet surface above it.
          </p>
          <div className="hero-capabilities" aria-label="Core capabilities">
            <span>HLS</span><span>DASH</span><span>LIVE</span><span>AUDIO</span><span>HDR</span><span>SDK</span>
          </div>
        </div>

        <div className="player-stage"><VelaStudio /></div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div className="section-index">01</div>
        <div>
          <p className="eyebrow" id="principles-title">Playback model</p>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h2>Tracks, not toggles.</h2>
              <p>Resolution, audio language, subtitles and chapters are exposed as real media tracks. Vela keeps one state model across HLS and DASH.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Live has its own clock.</h2>
              <p>Live playback uses the seekable DVR window rather than pretending an infinite stream is a VOD. Falling behind reveals a precise Go Live affordance.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Metadata stays visible.</h2>
              <p>HDR10, HLG, Dolby Vision, Dolby Audio and spatial-audio signals surface as restrained badges when the manifest and selected tracks expose them.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="embed-section" aria-labelledby="embed-title">
        <div className="section-index">02</div>
        <div className="embed-copy">
          <p className="eyebrow">Input system</p>
          <h2 id="embed-title">Keyboard and touch agree.</h2>
          <p>
            J/K/L, arrows, captions, mute and fullscreen map cleanly to desktop. Touch adds double-tap seeking and horizontal scrub gestures without changing the underlying control API.
          </p>
        </div>
        <pre className="embed-code"><code>{`Space / K   Play · Pause
← / →       Seek ±5s
J / L       Seek ±10s
↑ / ↓       Volume ±5%
C / M / F   Captions · Mute · Fullscreen
Home / End  Start · Live edge
Double tap  Seek ±10s
Swipe       Seek up to ±30s`}</code></pre>
      </section>

      <section className="distribution-section" aria-labelledby="distribution-title">
        <div className="section-index">03</div>
        <div className="distribution-copy">
          <p className="eyebrow">Distribution</p>
          <h2 id="distribution-title">React optional.</h2>
          <p>
            The same player ships as a React component, a framework-neutral iframe controller, and a custom element. The Web Component keeps Vela usable from plain HTML, Vue, Svelte or any other DOM environment.
          </p>
        </div>
        <pre className="distribution-code"><code>{`import "@vela/player/web-component";

<vela-player
  src="https://cdn.example.com/master.m3u8"
  type="hls"
  accent="#d8ff62">
</vela-player>

// or
import { VelaPlayer } from "@vela/player/react";`}</code></pre>
      </section>

      <section className="spec-strip" aria-label="Prototype features">
        <span>MULTI-AUDIO</span>
        <span>HDR / DOLBY SIGNALS</span>
        <span>LIVE DVR</span>
        <span>CHAPTERS</span>
        <span>CAPTION STYLES</span>
        <span>KEYBOARD / GESTURES</span>
        <span>NPM PACKAGE</span>
        <span>WEB COMPONENT</span>
      </section>
    </main>
  );
}
