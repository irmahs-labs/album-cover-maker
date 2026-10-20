import { describe, expect, it } from "vitest";

import { applyMatrix, cssFilter, FILTERS, filterMatrix } from "./filters";

/** One pixel run through a filter. */
const through = (
  id: Parameters<typeof filterMatrix>[0],
  rgb: number[],
  s = 1
) => {
  const data = new Uint8ClampedArray([...rgb, 255]);
  applyMatrix(data, filterMatrix(id, s));
  return [...data];
};

/** How far apart a pixel's lowest and highest colour channels are. */
const spread = (p: number[]) =>
  Math.max(...p.slice(0, 3)) - Math.min(...p.slice(0, 3));

describe("filters", () => {
  it("offers the six filters in the design's order", () => {
    expect(FILTERS.map((f) => f.name)).toEqual([
      "Original",
      "Mono",
      "Warm",
      "Cool",
      "Fade",
      "Vivid",
    ]);
  });

  it("leaves the photo alone for Original, or any filter at 0% strength", () => {
    for (const { id } of FILTERS) {
      expect(through(id, [40, 80, 200], 0)).toEqual([40, 80, 200, 255]);
    }
    expect(through("original", [40, 80, 200])).toEqual([40, 80, 200, 255]);
  });

  it("turns colours grey with Mono, by their luminance", () => {
    const [r, g, b] = through("mono", [40, 80, 200]);
    expect(r).toBe(g);
    expect(g).toBe(b);
    // 0.2126 × 40 + 0.7152 × 80 + 0.0722 × 200
    expect(r).toBe(Math.round(0.2126 * 40 + 0.7152 * 80 + 0.0722 * 200));
  });

  it("goes halfway at 50% strength", () => {
    // Channel 2 is blue.
    const { 2: full } = through("mono", [40, 80, 200]);
    const { 2: half } = through("mono", [40, 80, 200], 0.5);
    expect(half).toBeCloseTo((200 + full) / 2, -0.5);
  });

  it("warms a grey towards red, and cools it towards blue", () => {
    const [wr, , wb] = through("warm", [128, 128, 128]);
    expect(wr).toBeGreaterThan(wb);
    const [cr, , cb] = through("cool", [200, 120, 60]);
    const [or, , ob] = [200, 120, 60];
    expect(cb - cr).toBeGreaterThan(ob - or);
  });

  it("flattens contrast with Fade and boosts colour with Vivid", () => {
    expect(spread(through("fade", [200, 120, 60]))).toBeLessThan(140);
    expect(spread(through("vivid", [200, 120, 60]))).toBeGreaterThan(140);
  });

  it("keeps the alpha channel", () => {
    const data = new Uint8ClampedArray([10, 20, 30, 77]);
    applyMatrix(data, filterMatrix("vivid"));
    expect(data[3]).toBe(77);
  });

  it("writes the same chain as CSS for the thumbnails", () => {
    expect(cssFilter("original")).toBe("none");
    expect(cssFilter("mono")).toBe("grayscale(1)");
    expect(cssFilter("cool")).toBe(
      "hue-rotate(-18deg) saturate(0.85) brightness(1.05)"
    );
    expect(cssFilter("mono", 0.5)).toBe("grayscale(0.5)");
    expect(cssFilter("vivid", 0)).toBe("saturate(1) contrast(1)");
  });
});
