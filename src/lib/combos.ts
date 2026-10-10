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
  { id: "night-drive", name: "Night drive", titleFont: "Bebas Neue", subtitleFont: "Figtree", titleStyle: PLAIN, playerShift: 0, buttonShift: -5 },
  { id: "matcha-latte", name: "Matcha latte", titleFont: "DM Serif Display", subtitleFont: "Figtree", titleStyle: PLAIN, playerShift: 40, buttonShift: 60 },
  { id: "blue-hour", name: "Blue hour", titleFont: "Syne", subtitleFont: "Space Grotesk", titleStyle: PLAIN, playerShift: 180, buttonShift: 180 },
  { id: "lo-fi-tape", name: "Lo-fi tape", titleFont: "Playfair Display", subtitleFont: "IBM Plex Mono", titleStyle: { ...PLAIN, italic: true }, playerShift: -25, buttonShift: -30 },
  { id: "sakura-pop", name: "Sakura pop", titleFont: "Righteous", subtitleFont: "Karla", titleStyle: PLAIN, playerShift: -60, buttonShift: -60 },
  { id: "late-cinema", name: "Late cinema", titleFont: "Anton", subtitleFont: "Work Sans", titleStyle: PLAIN, playerShift: 15, buttonShift: 15 },
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
    return { combo, playerHue: wrap(base + combo.playerShift), buttonHue: wrap(base + combo.buttonShift) };
  });
}
