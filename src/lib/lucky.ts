import { hslToHex } from "./color";
import { COMBOS } from "./combos";
import type { TextStyle } from "./fonts";
import { CORNERS, LABEL_SIZES, TEXT_ALIGNS, TEXT_POSITIONS } from "./state";
import type { CoverState } from "./state";

/** A source of numbers in [0, 1), like Math.random. */
type Random = () => number;

const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];
const chance = (p: number, random: Random) => random() < p;
const wrap = (h: number) => ((Math.round(h) % 360) + 360) % 360;

/**
 * Text colours that read on most photos: cream, white and a near-black,
 * plus a pale tint, a bright tone and a deep shade of each photo hue.
 */
export const textColors = (photoHues: number[]): string[] => {
  const hues = photoHues.length ? photoHues : [40];
  return [
    "#fff3cf",
    "#ffffff",
    "#1f2420",
    ...hues.flatMap((h) => [
      hslToHex(h, 70, 88),
      hslToHex(h, 80, 60),
      hslToHex(h, 55, 20),
    ]),
  ].map((c) => c.toLowerCase());
};

/** Mostly plain, sometimes bold or italic, now and then underlined or struck. */
const treatment = (random: Random, bold = false): TextStyle => ({
  bold: bold || chance(0.3, random),
  italic: chance(0.25, random),
  strike: chance(0.06, random),
  underline: chance(0.12, random),
});

/**
 * "I'm feeling lucky": a new label size and corner, font pairing, text
 * colours, treatments, spot and alignment, and player and button colours.
 * The words, the photo and whether the label and text show are left as
 * they are.
 */
export const feelingLucky = (
  state: CoverState,
  photoHues: number[],
  random: Random = Math.random
): CoverState => {
  const hues = photoHues.length ? photoHues : [40];
  const combo = pick(COMBOS, random);
  const colors = textColors(hues);
  const titleColor = pick(colors, random);
  const subtitleColor = chance(0.6, random) ? titleColor : pick(colors, random);
  const playerHue = wrap(pick(hues, random) + (random() * 2 - 1) * 90);
  const buttonHue = wrap(playerHue + pick([0, 0, 30, -30, 180], random));
  // Any of the nine spots: one the label holds sends the text to the
  // middle of that side, as it would by hand.
  const textPosition = pick(TEXT_POSITIONS, random);
  const textAlign = pick(TEXT_ALIGNS, random);
  return {
    ...state,
    buttonHue,
    comboId: null,
    labelCorner: pick(CORNERS, random),
    labelSize: pick(LABEL_SIZES, random).percent,
    playerHue,
    subtitleColor,
    subtitleFont: combo.subtitleFont,
    subtitleStyle: treatment(random),
    textAlign,
    textPosition,
    titleColor,
    titleFont: combo.titleFont,
    titleStyle: treatment(random, combo.titleStyle.bold),
  };
};
