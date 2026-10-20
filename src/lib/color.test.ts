import { describe, expect, it } from "vitest";

import {
  buttonColor,
  dominantColor,
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

/** WCAG relative luminance of a #rrggbb colour. */
const lum = (hex: string) => {
  const c = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));

  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

describe("player colours", () => {
  it("keep button text readable on the player background", () => {
    for (let h = 0; h < 360; h += 15) {
      const ratio = (lum(playerColor(h)) + 0.05) / (lum(buttonColor(h)) + 0.05);
      expect(ratio).toBeGreaterThan(4.5);
    }
  });
});

/** Opaque RGBA pixels: `n` of each [r, g, b, n]. */
const opaquePixels = (...colors: [number, number, number, number][]) =>
  colors.flatMap(([r, g, b, n]) =>
    Array.from({ length: n }, () => [r, g, b, 255]).flat()
  );

describe("dominantHues", () => {
  it("puts the most common saturated hue first and ignores greys", () => {
    const data = opaquePixels(
      [0, 0, 255, 50],
      [255, 0, 0, 20],
      [128, 128, 128, 500]
    );

    const hues = dominantHues(data, 3);
    expect(hues[0]).toBe(240);
    expect(hues[1]).toBe(0);
  });

  it("falls back for a grey image", () => {
    expect(dominantHues(opaquePixels([30, 30, 30, 10]), 3, 77)).toEqual([77]);
  });
});

/** RGBA pixels: `n` of each [n, rgba]. */
const pixelRuns = (...runs: [number, [number, number, number, number]][]) =>
  runs.flatMap(([n, rgba]) => Array.from({ length: n }, () => rgba).flat());

describe("dominantColor", () => {
  it("picks the colour most of the image is, averaged", () => {
    const data = pixelRuns(
      [60, [120, 170, 170, 255]],
      [40, [124, 174, 174, 255]],
      [70, [230, 120, 40, 255]]
    );

    // The two teals share a box and outnumber the orange: 60 × 120 and
    // 40 × 124 average to 122 (7A), and 170 and 174 to 172 (AC).
    expect(dominantColor(data)).toBe("#7AACAC");
  });

  it("ignores see-through pixels", () => {
    const data = pixelRuns([90, [0, 0, 0, 0]], [10, [230, 120, 40, 255]]);
    expect(dominantColor(data)).toBe("#E67828");
  });

  it("falls back when nothing is opaque", () => {
    expect(dominantColor(pixelRuns([4, [9, 9, 9, 0]]))).toBe("#3B4A42");
    expect(dominantColor([], "#123456")).toBe("#123456");
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
