import { COMBOS } from "../lib/combos";
import { useCopy } from "../lib/language";
import { DEFAULT_STATE } from "../lib/state";
import type { CoverState } from "../lib/state";
import { linkTo } from "../router";
import { AccountButton } from "./account-button";
import { CoverCanvas, useFontsReady } from "./cover-canvas";
import { LanguageToggle } from "./language-toggle";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Window } from "./window";

const SAMPLE: CoverState = {
  ...DEFAULT_STATE,
  subtitle: "Alexa",
  title: "Sleepless Nights",
};

const COPY = {
  en: {
    badge: "no login needed",
    by: "by Irma HS",
    cta: "start making your cover",
    faq: [
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
    ],
    free: "Free to use. Your photo never leaves your device.",
    get: [
      ["Cover PNG", "3000 × 3000, ready for release"],
      ["Player PNG", "1080 × 1440, for stories and posts"],
      ["Advisory label", "on or off, any corner, any size"],
      ["Combos", "font and colour pairs picked from your photo"],
    ],
    how: "how it works",
    lead: "Drop in a photo, add your title and export a 3000 × 3000 PNG. No sign-up, no account, nothing to install.",
    make: "make a cover",
    more: "more apps at",
    start: "start making",
    steps: [
      {
        text: "Any JPEG, PNG or WebP. It's cropped to a square, and you can zoom and drag to frame it.",
        title: "Drop in a photo",
      },
      {
        text: `Type the album and artist name, then pick one of ${COMBOS.length} font pairings or mix your own.`,
        title: "Add your title",
      },
      {
        text: "Download the cover at 3000 × 3000 and a player mock-up at 1080 × 1440 for socials.",
        title: "Export",
      },
    ],
    title: "Make your album cover in your browser.",
  },
  fr: {
    badge: "sans connexion",
    by: "par Irma HS",
    cta: "commencer votre pochette",
    faq: [
      {
        a: "Non. Pas d’inscription ni de connexion. Ouvrez l’éditeur et lancez-vous.",
        q: "Faut-il un compte ?",
      },
      {
        a: "Nulle part. Tout se passe dans votre navigateur, et rien n’est envoyé à un serveur.",
        q: "Où va ma photo ?",
      },
      {
        a: "Oui. Faites autant de pochettes que vous voulez.",
        q: "C’est gratuit ?",
      },
      {
        a: "La pochette s’exporte en 3000 × 3000 px, la taille demandée par les plateformes de streaming.",
        q: "La pochette est-elle assez grande pour le streaming ?",
      },
    ],
    free: "Gratuit. Votre photo ne quitte jamais votre appareil.",
    get: [
      ["Pochette PNG", "3000 × 3000, prête pour la sortie"],
      ["Lecteur PNG", "1080 × 1440, pour les stories et les posts"],
      [
        "Logo Parental Advisory",
        "affiché ou non, dans n’importe quel coin, à toute taille",
      ],
      ["Combos", "des paires de polices et de couleurs tirées de votre photo"],
    ],
    how: "comment ça marche",
    lead: "Déposez une photo, ajoutez votre titre et exportez un PNG de 3000 × 3000. Sans inscription, sans compte, rien à installer.",
    make: "créer une pochette",
    more: "plus d’apps sur",
    start: "commencer",
    steps: [
      {
        text: "N’importe quel JPEG, PNG ou WebP. Elle est recadrée en carré, et vous pouvez zoomer et la faire glisser pour la cadrer.",
        title: "Déposez une photo",
      },
      {
        text: `Tapez le nom de l’album et de l’artiste, puis choisissez l’un des ${COMBOS.length} duos de polices ou composez le vôtre.`,
        title: "Ajoutez votre titre",
      },
      {
        text: "Téléchargez la pochette en 3000 × 3000 et une maquette de lecteur en 1080 × 1440 pour les réseaux.",
        title: "Exportez",
      },
    ],
    title: "Créez la pochette de votre album dans votre navigateur.",
  },
};

export const Landing = () => {
  const fontsTick = useFontsReady(SAMPLE);
  const t = useCopy(COPY);

  return (
    <div className="page dotted">
      <header className="topbar">
        <a href="/" onClick={linkTo("/")} className="brand">
          <Logo />
          <span>
            <span className="brand-name">Album Cover Maker</span>
            <span className="brand-by">{t.by}</span>
          </span>
        </a>
        <div className="topbar-end">
          <LanguageToggle />
          <ThemeToggle />
          <AccountButton />
          <a href="/make" onClick={linkTo("/make")} className="pill">
            {t.make}
          </a>
        </div>
      </header>

      <main className="landing">
        <Window name="hello.txt" className="hero">
          <div className="hero-copy">
            <span className="badge">{t.badge}</span>
            <h1>{t.title}</h1>
            <p className="hero-lead">{t.lead}</p>
            <div className="hero-actions">
              <a
                href="/make"
                onClick={linkTo("/make")}
                className="pill primary big"
              >
                {t.start}
              </a>
              <a href="#how" className="pill big">
                {t.how}
              </a>
            </div>
            <p className="muted small">{t.free}</p>
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

        <Window name="how-it-works.md" className="how">
          <ol id="how" className="steps">
            {t.steps.map((s, i) => (
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

        <Window name="what-you-get.zip" className="get">
          <ul className="get-list">
            {t.get.map(([name, what]) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{what}</span>
              </li>
            ))}
          </ul>
        </Window>

        <Window name="faq.txt" className="faq">
          <dl className="faq-list">
            {t.faq.map((f) => (
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
            {t.cta}
          </a>
        </div>
      </main>

      <footer className="footer">
        {t.more} <a href="https://irmahs.dev">irmahs.dev</a>
      </footer>
    </div>
  );
};
