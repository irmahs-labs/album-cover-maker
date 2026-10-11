import { describe, expect, it } from "vitest";

import { COMBOS, suggestCombos } from "./combos";
import {
  PAIRS,
  SUBTITLE_FONTS,
  TITLE_FONTS,
  fontsStylesheetUrl,
} from "./fonts";
import { DEFAULT_STATE } from "./state";

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
    const quicksand = COMBOS.find((c) => c.titleFont === "Quicksand");
    expect(quicksand?.titleStyle.bold).toBe(true);
    expect(quicksand?.name).toBe("Quicksand Bold");
  });

  it("starts on a combo that exists", () => {
    expect(COMBOS.map((c) => c.id)).toContain(DEFAULT_STATE.comboId);
    expect(COMBOS[0]).toMatchObject({
      subtitleFont: DEFAULT_STATE.subtitleFont,
      titleFont: DEFAULT_STATE.titleFont,
    });
  });

  it("asks Google Fonts for every family once", () => {
    const url = fontsStylesheetUrl();
    expect(url.match(/family=Lato:/gu)).toHaveLength(1);
    expect(url).toContain("family=Stint+Ultra+Expanded:");
  });
});

describe("suggestCombos", () => {
  it("offers every combo once", () => {
    const ids = suggestCombos([200]).map((s) => s.combo.id);
    expect(new Set(ids).size).toBe(COMBOS.length);
  });

  it("derives colours from the photo hue", () => {
    const first = suggestCombos([200])[0];
    expect(first.playerHue).toBe((200 + first.combo.playerShift + 360) % 360);
  });

  it("gives a different order on shuffle", () => {
    const a = suggestCombos([10, 120, 250], 0).map((s) => s.combo.id);
    const b = suggestCombos([10, 120, 250], 1).map((s) => s.combo.id);
    expect(a).not.toEqual(b);
  });

  it("shuffles to the same order for the same round", () => {
    const a = suggestCombos([10], 4).map((s) => s.combo.id);
    const b = suggestCombos([10], 4).map((s) => s.combo.id);
    expect(a).toEqual(b);
  });

  it("keeps hues inside 0-359", () => {
    for (const s of suggestCombos([5, 355], 3)) {
      expect(s.playerHue).toBeGreaterThanOrEqual(0);
      expect(s.playerHue).toBeLessThan(360);
    }
  });
});
