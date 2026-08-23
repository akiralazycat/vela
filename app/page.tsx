import { VelaPlayer } from "@/components/VelaPlayer";

const demoSource =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Vela home">
          <span className="wordmark-mark" aria-hidden="true">◒</span>
          VELA
        </a>
        <span className="build-label">PLAYER / PROTOTYPE 01</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A quieter way to watch</p>
          <h1>Video, without<br />the chrome.</h1>
          <p className="lede">
            A deliberately restrained player for products where the interface should feel
            designed, not inherited.
          </p>
        </div>

        <div className="player-stage">
          <VelaPlayer
            title="Drift / 01"
            eyebrow="VELA FILMS"
            src={demoSource}
            poster="/vela-poster.svg"
            accent="#d8ff62"
            captionsSrc="/demo-en.vtt"
          />
          <div className="stage-meta" aria-label="Demo details">
            <span>16:9 / adaptive surface</span>
            <span>keyboard + touch</span>
            <span>accent / lime 01</span>
          </div>
        </div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div className="section-index">01</div>
        <div>
          <p className="eyebrow" id="principles-title">Interaction model</p>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h2>Poster first.</h2>
              <p>The thumbnail gets the stage. Playback begins from the lower-left, never from a giant button stamped over the image.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Controls recede.</h2>
              <p>Transport controls appear when they are useful and disappear while the film is doing the work.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Scrub with context.</h2>
              <p>Hovering the timeline seeks a lightweight preview video so the prototype shows real frames without a sprite pipeline.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="spec-strip" aria-label="Prototype features">
        <span>PLAY / PAUSE</span>
        <span>SCRUB PREVIEW</span>
        <span>VOLUME</span>
        <span>CAPTIONS</span>
        <span>SPEED</span>
        <span>LOOP</span>
        <span>PIP</span>
        <span>FULLSCREEN</span>
      </section>
    </main>
  );
}
