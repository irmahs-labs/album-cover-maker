/**
 * Every title + subtitle pairing on offer, in the order they are suggested.
 * The two font menus are built from it, so a font only needs adding here.
 */
export const PAIRS = [
  ["Abril Fatface", "Lato"],
  ["Fugaz One", "Work Sans"],
  ["Space Mono", "Plus Jakarta Sans"],
  ["Grand Hotel", "Lato"],
  ["Raleway", "Merriweather"],
  ["Chonburi", "Domine"],
  ["Inter", "Krub"],
  ["Oswald", "Source Serif 4"],
  ["Arima Madurai", "Mulish"],
  ["Nunito", "Lora"],
  ["Ultra", "Slabo 27px"],
  ["Arvo", "Lato"],
  ["Unica One", "Crimson Text"],
  ["Cinzel", "Fauna One"],
  ["Yeseva One", "Josefin Sans"],
  ["Sacramento", "Alice"],
  ["Roboto", "Lora"],
  ["Montserrat", "Karla"],
  ["Fjalla One", "Cantarell"],
  ["Source Sans 3", "Alegreya"],
  ["Stint Ultra Expanded", "Pontano Sans"],
  ["Ubuntu", "Rokkitt"],
  ["Nunito", "PT Sans"],
  ["DotGothic16", "Space Mono"],
  ["Playfair Display", "Lato"],
  ["Quicksand", "Quicksand"],
  ["Syne", "Inter"],
  ["Yellowtail", "Rethink Sans"],
  ["Rufina", "Average Sans"],
  ["Poiret One", "Montserrat"],
  ["Sintony", "Poppins"],
  ["Philosopher", "Mulish"],
  ["Cardo", "Hind"],
  ["Bubblegum Sans", "Open Sans"],
  ["Archivo Narrow", "Archivo Narrow"],
  ["Rethink Sans", "Spectral"],
  ["Crimson Text", "DM Sans"],
  ["Young Serif", "Instrument Sans"],
  ["Instrument Sans", "Geist"],
] as const;

export type TitleFont = (typeof PAIRS)[number][0];
export type SubtitleFont = (typeof PAIRS)[number][1];

const unique = <T>(list: T[]) => [...new Set(list)];

export const TITLE_FONTS: TitleFont[] = unique(PAIRS.map(([title]) => title));
export const SUBTITLE_FONTS: SubtitleFont[] = unique(
  PAIRS.map(([, subtitle]) => subtitle)
);

export interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

export const PLAIN: TextStyle = {
  bold: false,
  italic: false,
  strike: false,
  underline: false,
};

/** Weight each family is drawn at when bold is off. */
const BASE_WEIGHT: Partial<Record<string, number>> = {
  "Playfair Display": 700,
  Syne: 700,
};

/** What the browser shows for the moment before a family has loaded. */
const FALLBACK: Partial<Record<string, string>> = {
  "Abril Fatface": "serif",
  Alegreya: "serif",
  Alice: "serif",
  Arvo: "serif",
  Cardo: "serif",
  Chonburi: "serif",
  Cinzel: "serif",
  "Crimson Text": "serif",
  Domine: "serif",
  "Fauna One": "serif",
  "Grand Hotel": "cursive",
  Lora: "serif",
  Merriweather: "serif",
  "Playfair Display": "serif",
  Rokkitt: "serif",
  Rufina: "serif",
  Sacramento: "cursive",
  "Slabo 27px": "serif",
  "Source Serif 4": "serif",
  "Space Mono": "monospace",
  Spectral: "serif",
  Ultra: "serif",
  Yellowtail: "cursive",
  "Yeseva One": "serif",
  "Young Serif": "serif",
};

export function cssFont(family: string, style: TextStyle, px: number): string {
  const weight = style.bold ? 700 : (BASE_WEIGHT[family] ?? 400);
  return `${style.italic ? "italic " : ""}${weight} ${px}px "${family}", ${FALLBACK[family] ?? "sans-serif"}`;
}

/**
 * One Google Fonts stylesheet for every family above. Asking each for
 * regular, bold and both italics is safe: Google only returns the faces a
 * family has, and the browser fakes the rest.
 */
export const fontsStylesheetUrl = () => {
  const families = unique(PAIRS.flat()).map(
    (f) => `family=${f.replaceAll(" ", "+")}:ital,wght@0,400;0,700;1,400;1,700`
  );
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
};

let stylesheet: Promise<void> | null = null;

/** Adds the stylesheet once; resolves when it has loaded or failed. */
const ensureStylesheet = () => {
  stylesheet ??= new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontsStylesheetUrl();
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => resolve());
    document.head.append(link);
  });
  return stylesheet;
};

/** Waits until the given font faces are usable on a canvas. Never rejects. */
export async function loadFonts(specs: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }
  await ensureStylesheet();
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => [])));
}
