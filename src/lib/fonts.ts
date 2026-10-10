export const TITLE_FONTS = [
  "Abril Fatface",
  "Bebas Neue",
  "DM Serif Display",
  "Anton",
  "Playfair Display",
  "Righteous",
  "Syne",
] as const;
export const SUBTITLE_FONTS = [
  "Lato",
  "Figtree",
  "Space Grotesk",
  "Karla",
  "Lora",
  "IBM Plex Mono",
  "Work Sans",
] as const;

export type TitleFont = (typeof TITLE_FONTS)[number];
export type SubtitleFont = (typeof SUBTITLE_FONTS)[number];

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
const BASE_WEIGHT: Record<string, number> = {
  Figtree: 500,
  "Playfair Display": 700,
  "Space Grotesk": 500,
  Syne: 700,
  "Work Sans": 400,
};

const FALLBACK: Record<string, string> = {
  "Abril Fatface": "serif",
  "DM Serif Display": "serif",
  "IBM Plex Mono": "monospace",
  Lora: "serif",
  "Playfair Display": "serif",
};

export function cssFont(family: string, style: TextStyle, px: number): string {
  const weight = style.bold ? 700 : (BASE_WEIGHT[family] ?? 400);
  return `${style.italic ? "italic " : ""}${weight} ${px}px "${family}", ${FALLBACK[family] ?? "sans-serif"}`;
}

/** Waits until the given font faces are usable on a canvas. Never rejects. */
export async function loadFonts(specs: string[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => [])));
}
