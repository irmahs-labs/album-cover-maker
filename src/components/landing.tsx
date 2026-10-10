import { DEFAULT_STATE } from "../lib/state";
import type { CoverState } from "../lib/state";
import { linkTo } from "../router";
import { CoverCanvas, useFontsReady } from "./cover-canvas";
import { Logo } from "./logo";

const SAMPLE: CoverState = {
  ...DEFAULT_STATE,
  subtitle: "Alexa",
  title: "Sleepless Nights",
};

function Window({
  name,
  children,
  className = "",
}: {
  name: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`window ${className}`}
      aria-label={name.replaceAll(/[._]/g, " ")}
    >
      <div className="window-bar">
        <span className="window-name">{name}</span>
        <span className="window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="window-body">{children}</div>
    </section>
  );
}

const STEPS = [
  {
    text: "Any JPEG, PNG or WebP. It's cropped to a square, and you can zoom and drag to frame it.",
    title: "Drop in a photo",
  },
  {
    text: "Type the album and artist name, then pick a combo or choose from 14 fonts yourself.",
    title: "Add your title",
  },
  {
    text: "Download the cover at 3000 × 3000 and a player mock-up at 1080 × 1440 for socials.",
    title: "Export",
  },
];

const FAQ = [
  {
    a: "No. There's no sign-up and no login. Open the maker and start.",
    q: "Do I need an account?",
  },
  {
    a: "Nowhere. Everything happens in your browser, and nothing is uploaded to a server.",
    q: "Where does my photo go?",
  },
  { a: "Yes. Make as many covers as you like.", q: "Is it free?" },
  {
    a: "The cover exports at 3000 × 3000 px, the size streaming stores ask for.",
    q: "Is the cover big enough for streaming?",
  },
];

export function Landing() {
  const fontsTick = useFontsReady(SAMPLE);

  return (
    <div className="page dotted">
      <header className="topbar">
        <a href="/" onClick={linkTo("/")} className="brand">
          <Logo />
          <span>
            <span className="brand-name">Album Cover Maker</span>
            <span className="brand-by">by Irma HS</span>
          </span>
        </a>
        <a href="/make" onClick={linkTo("/make")} className="pill primary">
          make a cover
        </a>
      </header>

      <main className="landing">
        <Window name="hello.txt" className="hero">
          <div className="hero-copy">
            <span className="badge">no login needed</span>
            <h1>Make your album cover in your browser.</h1>
            <p className="hero-lead">
              Drop in a photo, add your title and export a 3000 × 3000 PNG. No
              sign-up, no account, nothing to install.
            </p>
            <div className="hero-actions">
              <a
                href="/make"
                onClick={linkTo("/make")}
                className="pill primary big"
              >
                start making
              </a>
              <a href="#how" className="pill big">
                how it works
              </a>
            </div>
            <p className="muted small">
              Free to use. Your photo never leaves your device.
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <CoverCanvas
              kind="cover"
              state={SAMPLE}
              photo={null}
              width={300}
              fontsTick={fontsTick}
              className="hero-cover"
            />
            <CoverCanvas
              kind="player"
              state={SAMPLE}
              photo={null}
              width={170}
              fontsTick={fontsTick}
              className="hero-player"
            />
          </div>
        </Window>

        <Window name="how_it_works.md" className="how">
          <ol id="how" className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </Window>

        <Window name="what_you_get" className="get">
          <ul className="get-list">
            <li>
              <strong>Cover PNG</strong>
              <span>3000 × 3000, ready for release</span>
            </li>
            <li>
              <strong>Player PNG</strong>
              <span>1080 × 1440, for stories and posts</span>
            </li>
            <li>
              <strong>Advisory label</strong>
              <span>on or off, any corner, any size</span>
            </li>
            <li>
              <strong>Combos</strong>
              <span>font and colour pairs picked from your photo</span>
            </li>
          </ul>
        </Window>

        <Window name="faq.txt" className="faq">
          <dl className="faq-list">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </Window>

        <div className="cta">
          <a
            href="/make"
            onClick={linkTo("/make")}
            className="pill primary big"
          >
            start making your cover
          </a>
        </div>
      </main>

      <footer className="footer">
        <Logo size={20} /> made by Irma HS
      </footer>
    </div>
  );
}
