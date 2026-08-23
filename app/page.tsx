import { VelaStudio } from "@/components/VelaStudio";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Vela home">
          <span className="wordmark-mark" aria-hidden="true">◒</span>
          VELA
        </a>
        <span className="build-label">PLAYER / PROTOTYPE 02</span>
      </header>

      <section className="hero hero-v2" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Adaptive video, designed down</p>
          <h1>Video, without<br />the chrome.</h1>
          <p className="lede">
            HLS and MPEG-DASH underneath. A deliberately restrained interface above it.
            Vela keeps streaming infrastructure powerful and the viewing surface quiet.
          </p>
          <div className="hero-capabilities" aria-label="Core capabilities">
            <span>HLS</span><span>DASH</span><span>ABR</span><span>SDK</span>
          </div>
        </div>

        <div className="player-stage">
          <VelaStudio />
        </div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div className="section-index">01</div>
        <div>
          <p className="eyebrow" id="principles-title">Playback architecture</p>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h2>Adaptive by default.</h2>
              <p>HLS and DASH share one control surface. Automatic bitrate selection remains available, while viewers can pin a real rendition such as 1080p or 720p.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Preview, not preload.</h2>
              <p>Timeline hover reads a WebVTT index and crops a sprite sheet. Scrubbing no longer spins up a second video element just to show a frame.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Language is native.</h2>
              <p>Manifest subtitles and external WebVTT tracks enter the same selector, so multilingual playback does not require a separate UI model.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="embed-section" aria-labelledby="embed-title">
        <div className="section-index">02</div>
        <div className="embed-copy">
          <p className="eyebrow">Embed SDK / API</p>
          <h2 id="embed-title">One element. Full control.</h2>
          <p>
            Vela can run as a React component or through the browser SDK. The iframe surface accepts
            play, pause, seek, volume, quality and caption commands over a small postMessage bridge.
          </p>
        </div>
        <pre className="embed-code"><code>{`<div data-vela-player
  data-src="https://cdn.example.com/master.m3u8"
  data-type="hls"
  data-accent="#d8ff62"></div>
<script src="/vela.js" defer></script>

<script>
  const player = Vela.mount('[data-vela-player]')
  player.quality(1080).captions('off')
</script>`}</code></pre>
      </section>

      <section className="spec-strip" aria-label="Prototype features">
        <span>HLS / DASH</span>
        <span>ABR + MANUAL QUALITY</span>
        <span>SPRITE / VTT PREVIEW</span>
        <span>MULTI-SUBTITLE</span>
        <span>THEME BUILDER</span>
        <span>IFRAME SDK</span>
        <span>REACT REF API</span>
        <span>PIP / FULLSCREEN</span>
      </section>
    </main>
  );
}
