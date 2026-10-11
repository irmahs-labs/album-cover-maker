import { describe, expect, it } from "vitest";

import {
  buttonColor,
  dominantHues,
  hslToHex,
  isDark,
  playerColor,
  rgbToHsl,
} from "./color";

describe("hslToHex", () => {
  it("converts primaries", () => {
    expect(hslToHex(0, 100, 50)).toBe("#FF0000");
    expect(hslToHex(120, 100, 50)).toBe("#00FF00");
    expect(hslToHex(240, 100, 50)).toBe("#0000FF");
    expect(hslToHex(360, 100, 50)).toBe("#FF0000");
  });
});

describe("rgbToHsl", () => {
  it("round-trips a mid colour", () => {
    const [h, s, l] = rgbToHsl(63, 107, 48);
    expect(Math.round(h)).toBe(105);
    expect(s).toBeGreaterThan(0.3);
    expect(l).toBeGreaterThan(0.2);
  });
});

describe("player colours", () => {
  it("keep button text readable on the player background", () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5]
        .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (let h = 0; h < 360; h += 15) {
      const ratio = (lum(playerColor(h)) + 0.05) / (lum(buttonColor(h)) + 0.05);
      expect(ratio).toBeGreaterThan(4.5);
    }
  });
});

describe("dominantHues", () => {
  const pixels = (...colors: [number, number, number, number][]) =>
    colors.flatMap(([r, g, b, n]) =>
      Array.from({ length: n }, () => [r, g, b, 255]).flat()
    );

  it("puts the most common saturated hue first and ignores greys", () => {
    const data = pixels([0, 0, 255, 50], [255, 0, 0, 20], [128, 128, 128, 500]);
    const hues = dominantHues(data, 3);
    expect(hues[0]).toBe(240);
    expect(hues[1]).toBe(0);
  });

  it("falls back for a grey image", () => {
    expect(dominantHues(pixels([30, 30, 30, 10]), 3, 77)).toEqual([77]);
  });
});

describe("isDark", () => {
  it("tells dark text colours from light ones", () => {
    expect(isDark("#1f2420")).toBe(true);
    expect(isDark("#000000")).toBe(true);
    expect(isDark("#fff3cf")).toBe(false);
    expect(isDark("#ffffff")).toBe(false);
  });
});
