import { describe, expect, it } from "vitest";

import { COMBOS } from "./combos";
import { feelingLucky, textColors } from "./lucky";
import {
  CORNERS,
  DEFAULT_STATE,
  LABEL_SIZES,
  TEXT_ALIGNS,
  TEXT_POSITIONS,
} from "./state";
import type { CoverState } from "./state";

/** A small seeded generator, so a run of rolls is the same every time. */
const seeded = (seed: number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
};

const start: CoverState = {
  ...DEFAULT_STATE,
  subtitle: "Alexa",
  title: "Sleepless Nights",
  zoom: 160,
};
const rolls = (count: number, hues = [200, 20]) => {
  const random = seeded(7);
  return Array.from({ length: count }, () => feelingLucky(start, hues, random));
};

describe("textColors", () => {
  it("offers cream, white and near-black, then three tones of each hue", () => {
    const colors = textColors([200, 20]);
    expect(colors.slice(0, 3)).toEqual(["#fff3cf", "#ffffff", "#1f2420"]);
    expect(colors).toHaveLength(3 + 2 * 3);
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/u);
    }
  });
});

describe("feelingLucky", () => {
  it("only picks sizes, corners, pairings and colours that exist", () => {
    const sizes = LABEL_SIZES.map((s) => s.percent as number);
    const colors = textColors([200, 20]);
    for (const s of rolls(200)) {
      expect(sizes).toContain(s.labelSize);
      expect(CORNERS).toContain(s.labelCorner);
      expect(TEXT_POSITIONS).toContain(s.textPosition);
      expect(TEXT_ALIGNS).toContain(s.textAlign);
      expect(
        COMBOS.some(
          (c) =>
            c.titleFont === s.titleFont && c.subtitleFont === s.subtitleFont
        )
      ).toBe(true);
      expect(colors).toContain(s.titleColor);
      expect(colors).toContain(s.subtitleColor);
      for (const hue of [s.playerHue, s.buttonHue]) {
        expect(Number.isInteger(hue) && hue >= 0 && hue < 360).toBe(true);
      }
    }
  });

  it("gives different results roll after roll", () => {
    const all = rolls(50);
    const distinct = (key: keyof CoverState) =>
      new Set(all.map((s) => JSON.stringify(s[key]))).size;
    expect(distinct("labelSize")).toBe(LABEL_SIZES.length);
    expect(distinct("labelCorner")).toBe(CORNERS.length);
    expect(distinct("textPosition")).toBe(TEXT_POSITIONS.length);
    expect(distinct("textAlign")).toBe(TEXT_ALIGNS.length);
    expect(distinct("titleFont")).toBeGreaterThan(10);
    expect(distinct("titleColor")).toBeGreaterThan(4);
    expect(distinct("titleStyle")).toBeGreaterThan(3);
    expect(distinct("playerHue")).toBeGreaterThan(20);
  });

  it("keeps the words, the photo framing and what is switched on", () => {
    for (const s of rolls(20)) {
      expect(s).toMatchObject({
        panX: start.panX,
        showLabel: true,
        showText: true,
        subtitle: "Alexa",
        title: "Sleepless Nights",
        zoom: 160,
      });
    }
  });

  it("keeps the bold for a family paired with itself", () => {
    const quicksand = COMBOS.findIndex((c) => c.titleFont === "Quicksand");
    // Land on that pairing, then roll "no" for every treatment.
    const values = [(quicksand + 0.5) / COMBOS.length];
    const random = () => values.shift() ?? 0.99;
    const s = feelingLucky(start, [200], random);
    expect(s.titleFont).toBe("Quicksand");
    expect(s.titleStyle.bold).toBe(true);
    expect(s.subtitleStyle.bold).toBe(false);
  });

  it("drops the pairing highlight, since the colours no longer match it", () => {
    expect(rolls(1)[0].comboId).toBeNull();
  });
});
