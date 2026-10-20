import { describe, expect, it } from "vitest";

import { COMBOS, suggestCombos } from "./combos";
import { PAIRS, SUBTITLE_FONTS, TITLE_FONTS } from "./fonts";
import { DEFAULT_STATE } from "./state";

import fontFaces from "../font-faces.css?raw";

describe("COMBOS", () => {
  it("has one combo per pairing, with unique ids", () => {
    expect(COMBOS).toHaveLength(PAIRS.length);
    expect(new Set(COMBOS.map((c) => c.id)).size).toBe(PAIRS.length);
  });

  it("puts every pairing's fonts in the menus", () => {
    for (const c of COMBOS) {
      expect(TITLE_FONTS).toContain(c.titleFont);
      expect(SUBTITLE_FONTS).toContain(c.subtitleFont);
    }
  });

  it("uses the bold for a family paired with itself", () => {
    for (const family of ["Quicksand", "Archivo Narrow"]) {
      const combo = COMBOS.find((c) => c.titleFont === family);
      expect(combo?.titleStyle.bold).toBe(true);
      expect(combo?.name).toBe(`${family} Bold`);
    }
  });

  it("keeps the other pairings in their regular weight", () => {
    const plain = COMBOS.filter((c) => !c.titleStyle.bold);
    expect(plain).toHaveLength(COMBOS.length - 2);
  });

  it("starts on a combo that exists", () => {
    expect(COMBOS.map((c) => c.id)).toContain(DEFAULT_STATE.comboId);
    expect(COMBOS[0]).toMatchObject({
      subtitleFont: DEFAULT_STATE.subtitleFont,
      titleFont: DEFAULT_STATE.titleFont,
    });
  });

  it("has a self-hosted font face for every family (run `npm run fonts` if not)", () => {
    for (const family of new Set(PAIRS.flat())) {
      expect(fontFaces).toContain(`font-family: '${family}';`);
    }
    expect(fontFaces).not.toContain("googleapis");
  });
});

describe("suggestCombos", () => {
  it("offers every combo once", () => {
    const ids = suggestCombos([200]).map((s) => s.combo.id);
    expect(new Set(ids).size).toBe(COMBOS.length);
  });

  it("derives colours from the photo hue", () => {
    const [first] = suggestCombos([200]);
    expect(first.playerHue).toBe((200 + first.combo.playerShift + 360) % 360);
  });

  it("keeps the listed order, taking turns with the photo's hues", () => {
    const sugs = suggestCombos([10, 120, 250]);
    expect(sugs.map((s) => s.combo.id)).toEqual(COMBOS.map((c) => c.id));
    const base = (s: (typeof sugs)[number]) =>
      (s.playerHue - s.combo.playerShift + 360) % 360;
    expect(sugs.slice(0, 3).map(base)).toEqual([10, 120, 250]);
  });

  it("keeps hues inside 0-359", () => {
    for (const s of suggestCombos([5, 355])) {
      expect(s.playerHue).toBeGreaterThanOrEqual(0);
      expect(s.playerHue).toBeLessThan(360);
    }
  });
});
