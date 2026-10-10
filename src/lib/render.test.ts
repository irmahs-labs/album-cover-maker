import { describe, expect, it } from "vitest";
import { photoRect, wrapLines } from "./render";
import { slug } from "./state";

const measure = (s: string) => s.length * 10;

describe("wrapLines", () => {
  it("wraps on word boundaries", () => {
    expect(wrapLines("Sleepless Nights in Lyon", 100, measure)).toEqual(["Sleepless", "Nights in", "Lyon"]);
  });
  it("keeps short text on one line", () => {
    expect(wrapLines("Hi there", 200, measure)).toEqual(["Hi there"]);
  });
  it("keeps over-long words on their own line", () => {
    expect(wrapLines("a supercalifragilistic b", 50, measure)).toEqual(["a", "supercalifragilistic", "b"]);
  });
});

describe("photoRect", () => {
  it("covers the square with a landscape photo, centred", () => {
    const r = photoRect({ width: 2000, height: 1000 }, 500, 100, 0, 0);
    expect(r.h).toBe(500);
    expect(r.w).toBe(1000);
    expect(r.x).toBe(-250);
    expect(r.y).toBe(0);
  });
  it("pans to the edges", () => {
    expect(photoRect({ width: 2000, height: 1000 }, 500, 100, 1, 0).x).toBe(0);
    expect(photoRect({ width: 2000, height: 1000 }, 500, 100, -1, 0).x).toBe(-500);
  });
  it("zooms", () => {
    expect(photoRect({ width: 1000, height: 1000 }, 500, 200, 0, 0).w).toBe(1000);
  });
});

describe("slug", () => {
  it("makes safe file names", () => {
    expect(slug("Sleepless Nights Alexa")).toBe("sleepless-nights-alexa");
    expect(slug("Café Été!")).toBe("cafe-ete");
    expect(slug("???")).toBe("cover");
  });
});
