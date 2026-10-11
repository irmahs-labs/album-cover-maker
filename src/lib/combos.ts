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
  const same = titleFont === (subtitleFont as string);
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

/** The combos in a fixed shuffled order for each round; round 0 is the listed order. */
const shuffled = (round: number) => {
  const order = [...COMBOS];
  let seed = round;
  for (let i = order.length - 1; i > 0 && round > 0; i -= 1) {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/**
 * Turns the photo's hues into combo suggestions. `round` (from "shuffle
 * ideas") reshuffles the list and rotates which photo hue each combo
 * starts from, so every shuffle gives a different set.
 */
export function suggestCombos(photoHues: number[], round = 0): Suggestion[] {
  const hues = photoHues.length ? photoHues : [40];
  return shuffled(round).map((combo, i) => {
    const base = hues[(i + round) % hues.length];
    return {
      buttonHue: wrap(base + combo.buttonShift),
      combo,
      playerHue: wrap(base + combo.playerShift),
    };
  });
}
