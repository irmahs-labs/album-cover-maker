import type { SubtitleFont, TextStyle, TitleFont } from "./fonts";
import { PLAIN } from "./fonts";

export interface Combo {
  id: string;
  name: string;
  titleFont: TitleFont;
  subtitleFont: SubtitleFont;
  titleStyle: TextStyle;
  /** Shift applied to the photo's hue for the player background. */
  playerShift: number;
  /** Shift applied to the photo's hue for the player buttons and text. */
  buttonShift: number;
}

export const COMBOS: Combo[] = [
  {
    buttonShift: 0,
    id: "fatface",
    name: "Fatface",
    playerShift: 0,
    subtitleFont: "Lato",
    titleFont: "Abril Fatface",
    titleStyle: PLAIN,
  },
  {
    buttonShift: -5,
    id: "night-drive",
    name: "Night drive",
    playerShift: 0,
    subtitleFont: "Figtree",
    titleFont: "Bebas Neue",
    titleStyle: PLAIN,
  },
  {
    buttonShift: 60,
    id: "matcha-latte",
    name: "Matcha latte",
    playerShift: 40,
    subtitleFont: "Figtree",
    titleFont: "DM Serif Display",
    titleStyle: PLAIN,
  },
  {
    buttonShift: 180,
    id: "blue-hour",
    name: "Blue hour",
    playerShift: 180,
    subtitleFont: "Space Grotesk",
    titleFont: "Syne",
    titleStyle: PLAIN,
  },
  {
    buttonShift: -30,
    id: "lo-fi-tape",
    name: "Lo-fi tape",
    playerShift: -25,
    subtitleFont: "IBM Plex Mono",
    titleFont: "Playfair Display",
    titleStyle: { ...PLAIN, italic: true },
  },
  {
    buttonShift: -60,
    id: "sakura-pop",
    name: "Sakura pop",
    playerShift: -60,
    subtitleFont: "Karla",
    titleFont: "Righteous",
    titleStyle: PLAIN,
  },
  {
    buttonShift: 15,
    id: "late-cinema",
    name: "Late cinema",
    playerShift: 15,
    subtitleFont: "Work Sans",
    titleFont: "Anton",
    titleStyle: PLAIN,
  },
];

export interface Suggestion {
  combo: Combo;
  playerHue: number;
  buttonHue: number;
}

const wrap = (h: number) => ((Math.round(h) % 360) + 360) % 360;

/**
 * Turns the photo's hues into combo suggestions. `round` (from "shuffle
 * ideas") rotates which photo hue each combo starts from and the order the
 * combos are listed in, so every shuffle gives a different set.
 */
export function suggestCombos(photoHues: number[], round = 0): Suggestion[] {
  const hues = photoHues.length ? photoHues : [40];
  const n = COMBOS.length;
  return COMBOS.map((_, i) => {
    const combo = COMBOS[(i + round) % n];
    const base = hues[(i + round) % hues.length];
    return {
      buttonHue: wrap(base + combo.buttonShift),
      combo,
      playerHue: wrap(base + combo.playerShift),
    };
  });
}
