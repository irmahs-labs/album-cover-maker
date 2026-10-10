import { describe, expect, it } from "vitest";
import { COMBOS, suggestCombos } from "./combos";

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

  it("keeps hues inside 0-359", () => {
    for (const s of suggestCombos([5, 355], 3)) {
      expect(s.playerHue).toBeGreaterThanOrEqual(0);
      expect(s.playerHue).toBeLessThan(360);
    }
  });
});
