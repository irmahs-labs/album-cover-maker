import type { SubtitleFont, TextStyle, TitleFont } from "./fonts";
import { PAIRS, PLAIN } from "./fonts";

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

/** Player colour offsets from the photo's hue, cycled through the pairs. */
const SHIFTS = [
  [0, -5],
  [40, 60],
  [180, 180],
  [-25, -30],
  [-60, -60],
  [15, 15],
  [90, 100],
  [-120, -110],
] as const;

export const COMBOS: Combo[] = PAIRS.map(([titleFont, subtitleFont], i) => {
  // A family paired with itself (Quicksand, Archivo Narrow) uses its bold for the title.
  const same = titleFont === subtitleFont;
  const [playerShift, buttonShift] = SHIFTS[i % SHIFTS.length];

  return {
    buttonShift,
    id: `${titleFont}-${subtitleFont}`
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/gu, "-"),
    name: same ? `${titleFont} Bold` : titleFont,
    playerShift,
    subtitleFont,
    titleFont,
    titleStyle: same ? { ...PLAIN, bold: true } : PLAIN,
  };
});

export interface Suggestion {
  combo: Combo;
  playerHue: number;
  buttonHue: number;
}

const wrap = (h: number) => ((Math.round(h) % 360) + 360) % 360;

/**
 * Turns the photo's hues into combo suggestions, in the listed order. The
 * combos take turns starting from each photo hue, so the list mixes them.
 */
export const suggestCombos = (photoHues: number[]): Suggestion[] => {
  const hues = photoHues.length ? photoHues : [40];

  return COMBOS.map((combo, i) => {
    const base = hues[i % hues.length];

    return {
      buttonHue: wrap(base + combo.buttonShift),
      combo,
      playerHue: wrap(base + combo.playerShift),
    };
  });
};
