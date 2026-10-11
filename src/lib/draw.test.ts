import { beforeEach, describe, expect, it, vi } from "vitest";

import { playerColor } from "./color";
import { fakeContext } from "./fake-canvas";
import { PLAIN } from "./fonts";
import { drawCover, drawPlayer, photoRect } from "./render";
import { DEFAULT_STATE } from "./state";
import type { Corner, CoverState, Photo, TextPosition } from "./state";

// The label artwork is an image the browser loads; here it is a stand-in
// object, and each test decides whether it has "loaded".
const label = { label: true } as unknown as HTMLImageElement;
let labelLoaded = true;
vi.mock("./advisory", () => ({
  ADVISORY_ASPECT: 1.6,
  advisoryImage: () => (labelLoaded ? label : null),
}));

const SIZE = 1000;
const state = (patch: Partial<CoverState> = {}): CoverState => ({
  ...DEFAULT_STATE,
  subtitle: "Alexa",
  title: "Night",
  ...patch,
});
const photo: Photo = {
  height: 1000,
  image: { photo: true } as unknown as CanvasImageSource,
  name: "p.jpg",
  width: 2000,
};

const drawn = (
  patch: Partial<CoverState> = {},
  withPhoto: Photo | null = null
) => {
  const fake = fakeContext();
  const box = drawCover(fake.ctx, SIZE, state(patch), withPhoto);
  return { ...fake, box };
};
const labelCall = (fake: ReturnType<typeof fakeContext>) =>
  fake.named("drawImage").find((c) => c.args[0] === label);

beforeEach(() => {
  labelLoaded = true;
});

describe("drawCover: photo", () => {
  it("draws the photo where photoRect puts it", () => {
    const fake = drawn({ panX: 0.5, zoom: 150 }, photo);
    const r = photoRect(photo, SIZE, 150, 0.5, 0);
    expect(fake.named("drawImage")[0].args).toEqual([
      photo.image,
      r.x,
      r.y,
      r.w,
      r.h,
    ]);
  });

  it("draws the placeholder artwork when there is no photo", () => {
    const fake = drawn({ showLabel: false, showText: false });
    expect(fake.named("drawImage")).toHaveLength(0);
    expect(fake.named("arc").length).toBeGreaterThan(5);
  });
});

describe("drawCover: parental advisory label", () => {
  const corners: [Corner, number, number][] = [
    ["top-left", 35, 35],
    ["top-right", 1000 - 35 - 100, 35],
    ["bottom-left", 35, 1000 - 35 - 62.5],
    ["bottom-right", 1000 - 35 - 100, 1000 - 35 - 62.5],
  ];

  it.each(corners)(
    "sits in the %s corner, 3.5%% in from the edges",
    (corner, x, y) => {
      const call = labelCall(drawn({ labelCorner: corner, labelSize: 10 }));
      expect(call?.args).toEqual([label, x, y, 100, 62.5]);
    }
  );

  it("scales with the label size and keeps its 1.6 : 1 shape", () => {
    const call = labelCall(drawn({ labelSize: 20 }));
    expect(call?.args.slice(3)).toEqual([200, 125]);
  });

  it("goes up to half the cover's width", () => {
    const call = labelCall(
      drawn({ labelCorner: "bottom-right", labelSize: 50 })
    );
    expect(call?.args).toEqual([
      label,
      1000 - 35 - 500,
      1000 - 35 - 312.5,
      500,
      312.5,
    ]);
  });

  it("is left out when switched off", () => {
    expect(labelCall(drawn({ showLabel: false }))).toBeUndefined();
  });

  it("is left out until the artwork has loaded", () => {
    labelLoaded = false;
    expect(labelCall(drawn())).toBeUndefined();
  });
});

describe("drawCover: text", () => {
  it("draws the title above the subtitle, subtitle in capitals", () => {
    const [title, subtitle] = drawn().texts();
    expect(subtitle.text).toBe("ALEXA");
    expect(title.text).toBe("Night");
    expect(title.y).toBeLessThan(subtitle.y);
    expect(title.px).toBeGreaterThan(subtitle.px);
    expect(title.x).toBe(60);
  });

  it("draws no text when it is switched off", () => {
    expect(drawn({ showText: false }).texts()).toHaveLength(0);
  });

  it("draws only what is filled in", () => {
    expect(
      drawn({ subtitle: "  " })
        .texts()
        .map((t) => t.text)
    ).toEqual(["Night"]);
    expect(
      drawn({ title: "" })
        .texts()
        .map((t) => t.text)
    ).toEqual(["ALEXA"]);
  });

  it("lifts the text above a bottom label it would run into", () => {
    const title = "The Very Long Name Of An Album";
    const { box } = drawn({ labelCorner: "bottom-right", title });
    // The label's top, less a 2% gap.
    expect((box?.y ?? 0) + (box?.h ?? 0)).toBeCloseTo(1000 - 35 - 62.5 - 20);
  });

  it("does not move the text when the bottom label is switched off", () => {
    const top = drawn({ labelCorner: "top-left" }).texts();
    const hidden = drawn({
      labelCorner: "bottom-left",
      showLabel: false,
    }).texts();
    expect(hidden[0].y).toBe(top[0].y);
  });

  // The lines, top to bottom.
  const titleLines = (title: string) =>
    drawn({ subtitle: "", title })
      .texts()
      .sort((a, b) => a.y - b.y);
  const fits = (line: { text: string; px: number }) =>
    line.text.length * line.px * 0.5 <= 880;

  it("wraps a long title onto more lines, in reading order", () => {
    const title = "The Very Long Name Of An Album";
    const lines = titleLines(title);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((l) => l.text).join(" ")).toBe(title);
    expect(lines.every(fits)).toBe(true);
  });

  it("shrinks a single word too wide for the cover until it fits", () => {
    const [line] = titleLines("Supercalifragilisticexpialidocious");
    expect(line.px).toBeLessThan(124);
    expect(fits(line)).toBe(true);
  });

  it("shrinks a very long title so it stays in the lower 70%", () => {
    const lines = titleLines(
      Array.from({ length: 30 }, () => "Word").join(" ")
    );
    expect(lines[0].px).toBeLessThan(124);
    expect(lines[0].y).toBeGreaterThan(300 - lines[0].px);
    expect(lines.every(fits)).toBe(true);
  });

  // A 50% label is 500 × 312.5, 35 in from the edges.
  const longTitle = Array.from({ length: 30 }, () => "Word").join(" ");
  const titleUnderBigLabel = (labelCorner: Corner) =>
    drawn({ labelCorner, labelSize: 50, subtitle: "", title: longTitle })
      .texts()
      .sort((a, b) => a.y - b.y);
  // Roughly where a line's capitals reach above its baseline.
  const capTop = (line: { y: number; px: number }) => line.y - line.px * 0.8;

  it("keeps a long title below a 50% label in the same row", () => {
    const lines = titleUnderBigLabel("top-right");
    expect(capTop(lines[0])).toBeGreaterThanOrEqual(35 + 312.5);
    expect(lines.every(fits)).toBe(true);
  });

  it("keeps a long title above a 50% label in its corner, and on the cover", () => {
    const lines = titleUnderBigLabel("bottom-left");
    expect(lines.at(-1)?.y).toBeLessThanOrEqual(1000 - 35 - 312.5);
    expect(capTop(lines[0])).toBeGreaterThanOrEqual(50);
    expect(lines.every(fits)).toBe(true);
  });

  it("keeps a short title at full size", () => {
    expect(drawn({ subtitle: "" }).texts()[0].px).toBeCloseTo(124);
  });

  it("draws an underline and a strike line under the styled title", () => {
    const rects = (style: Partial<typeof PLAIN>) =>
      drawn({
        showLabel: false,
        subtitle: "",
        titleStyle: { ...PLAIN, ...style },
      }).named("fillRect").length;
    const plain = rects({});
    expect(rects({ underline: true })).toBe(plain + 1);
    expect(rects({ strike: true })).toBe(plain + 1);
    expect(rects({ strike: true, underline: true })).toBe(plain + 2);
  });

  it("uses the chosen title font, bold and italic", () => {
    const fake = drawn({
      titleFont: "Cinzel",
      titleStyle: { ...PLAIN, bold: true, italic: true },
    });
    const title = fake.named("fillText").find((c) => c.args[0] === "Night");
    expect(title?.font).toMatch(/^italic 700 [\d.]+px "Cinzel"/u);
  });
});

describe("drawCover: text placement", () => {
  const SPOTS: [TextPosition, number, number][] = [
    ["top-left", 0, 0],
    ["top-center", 1, 0],
    ["top-right", 2, 0],
    ["middle-left", 0, 1],
    ["middle-center", 1, 1],
    ["middle-right", 2, 1],
    ["bottom-left", 0, 2],
    ["bottom-center", 1, 2],
    ["bottom-right", 2, 2],
  ];

  it.each(SPOTS)(
    "puts the text block %s, 6%% from the sides and 5%% from the top and bottom",
    (textPosition, column, row) => {
      const { box } = drawn({ showLabel: false, textPosition });
      if (!box) {
        throw new Error("no text box");
      }
      const xs = [box.x, box.x + box.w / 2, box.x + box.w];
      const ys = [box.y, box.y + box.h / 2, box.y + box.h];
      expect(xs[column]).toBeCloseTo([60, 500, 940][column]);
      expect(ys[row]).toBeCloseTo([50, 500, 950][row]);
    }
  );

  it("returns no box when there is no text", () => {
    expect(drawn({ showText: false }).box).toBeNull();
    expect(drawn({ subtitle: "", title: " " }).box).toBeNull();
  });

  it("returns the box the lines are drawn in", () => {
    const { box, texts } = drawn();
    const [title, subtitle] = texts();
    expect(box?.x).toBe(60);
    expect(title.y).toBeGreaterThan(box?.y ?? 0);
    expect(subtitle.y).toBeLessThan((box?.y ?? 0) + (box?.h ?? 0));
  });

  // In the fake canvas a line is half its font size per letter, less the
  // tracking after the last one: "Night" is 308 wide, "ALEXA" 89.
  it.each([
    ["left", 0],
    ["center", (308 - 89) / 2],
    ["right", 308 - 89],
  ] as const)("aligns the lines %s inside the block", (textAlign, inset) => {
    const { box, texts } = drawn({ showLabel: false, textAlign });
    const [title, subtitle] = texts();
    expect(title.x).toBeCloseTo(box?.x ?? 0);
    expect(subtitle.x - title.x).toBeCloseTo(inset);
  });

  it("moves the text to the middle of the side when the label has its corner", () => {
    for (const corner of ["bottom-left", "top-right"] as const) {
      const { box } = drawn({ labelCorner: corner, textPosition: corner });
      if (!box) {
        throw new Error("no text box");
      }
      expect(box.y + box.h / 2).toBeCloseTo(500);
      const side = corner.endsWith("left") ? box.x : box.x + box.w;
      expect(side).toBeCloseTo(corner.endsWith("left") ? 60 : 940);
    }
  });

  it("stays in its corner when the label is switched off", () => {
    const { box } = drawn({
      labelCorner: "bottom-left",
      showLabel: false,
      textPosition: "bottom-left",
    });
    expect((box?.y ?? 0) + (box?.h ?? 0)).toBeCloseTo(950);
  });

  it("keeps short text level with a label in the other top corner", () => {
    const { box } = drawn({
      labelCorner: "top-left",
      subtitle: "",
      textPosition: "top-right",
      title: "Hi",
    });
    expect(box?.y).toBeCloseTo(50);
  });

  it("drops wide text below a label in the same row", () => {
    const { box } = drawn({
      labelCorner: "top-left",
      textPosition: "top-center",
      title: "The Very Long Name Of An Album",
    });
    expect(box?.y).toBeCloseTo(35 + 62.5 + 20);
  });
});

describe("drawPlayer", () => {
  const player = (patch: Partial<CoverState> = {}) => {
    const fake = fakeContext();
    drawPlayer(fake.ctx, 300, state(patch), null);
    return fake;
  };

  it("fills the background with the player colour", () => {
    const first = player({ playerHue: 200 }).named("fillRect")[0];
    expect(first.args).toEqual([0, 0, 300, 400]);
    expect(first.fillStyle).toBe(playerColor(200));
  });

  it("shows the title and subtitle under the cover", () => {
    const texts = player()
      .texts()
      .map((t) => t.text);
    expect(texts).toContain("Night");
    expect(texts).toContain("Alexa");
    expect(texts).toContain("1:24");
  });

  it("says Untitled when there is no title", () => {
    expect(
      player({ title: "" })
        .texts()
        .map((t) => t.text)
    ).toContain("Untitled");
  });

  it("cuts a title too long for the player with an ellipsis", () => {
    const title = "A Title Far Too Long To Fit Under The Little Cover";
    const line = player({ showText: false, title }).texts()[0];
    expect(line.text.endsWith("…")).toBe(true);
    expect(line.text.length * line.px * 0.5).toBeLessThanOrEqual(244);
  });

  it("draws the cover inside it, inset by the padding", () => {
    const fake = player();
    expect(fake.named("translate")[0].args).toEqual([28, 28]);
    // A 10% label on the 244 px cover.
    const [w, h] = (labelCall(fake)?.args.slice(3) ?? []) as number[];
    expect(w).toBeCloseTo(24.4);
    expect(h).toBeCloseTo(15.25);
  });
});
