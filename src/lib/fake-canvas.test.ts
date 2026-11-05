import { describe, expect, it } from "vitest";

import { fontPx } from "./fake-canvas";

describe("fontPx", () => {
  it("reads the size in px out of a canvas font", () => {
    expect(fontPx('700 48px "Lato", sans-serif')).toBe(48);
    expect(fontPx('italic 400 54.4px "Lato"')).toBe(54.4);
  });

  it("falls back to 10 without a size", () => {
    expect(fontPx("bold Lato")).toBe(10);
  });

  it("answers at once for a long run of digits", () => {
    expect(fontPx("1".repeat(50_000))).toBe(10);
  });
});
