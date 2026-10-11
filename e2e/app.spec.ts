import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { jpegSize, pngSize, testPhoto } from "./photo";

const addPhoto = (page: Page) =>
  page.locator("#photo-file").setInputFiles({
    buffer: testPhoto(),
    mimeType: "image/png",
    name: "photo.png",
  });

/** The preview's pixel at (x, y), as a fraction of the cover's size. */
const pixel = (page: Page, x: number, y: number) =>
  page.locator(".cover-frame canvas").evaluate(
    (canvas: HTMLCanvasElement, [fx, fy]) => {
      const ctx = canvas.getContext("2d");
      const data = ctx?.getImageData(
        Math.round(canvas.width * fx),
        Math.round(canvas.height * fy),
        1,
        1
      ).data;
      return data ? [data[0], data[1], data[2]] : null;
    },
    [x, y]
  );
/**
 * Share of a label's area that is black, white or grey (the label's letters
 * blend to grey at small sizes, the orange test photo never is): by default the top-left
 * one (10% wide, 1.6 : 1, 3.5% in from the edges).
 */
const labelShare = (page: Page, corner = "top-left", width = 0.1) =>
  page.locator(".cover-frame canvas").evaluate(
    (canvas: HTMLCanvasElement, [where, w]) => {
      const ctx = canvas.getContext("2d");
      const at = (f: number) => Math.round(canvas.width * f);
      const h = w / 1.6;
      const x = where.endsWith("left") ? 0.035 : 1 - 0.035 - w;
      const y = where.startsWith("top") ? 0.035 : 1 - 0.035 - h;
      const data = ctx?.getImageData(at(x), at(y), at(w), at(h)).data ?? [];
      let plain = 0;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const grey = Math.max(r, g, b) - Math.min(r, g, b) < 24;
        if (grey) {
          plain += 1;
        }
      }
      return plain / (data.length / 4);
    },
    [corner, width] as const
  );

const exportFile = async (page: Page, button: string) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(".export", { hasText: button }).click(),
  ]);
  const path = await download.path();
  return { file: await readFile(path), name: download.suggestedFilename() };
};

test("the landing page leads to the maker, with no login", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Make your album cover in your browser.",
    })
  ).toBeVisible();
  await expect(page.getByText("no login needed")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole("link", { exact: true, name: "start making" }).click();
  await expect(page).toHaveURL(/\/make$/u);
  await expect(page.getByRole("form", { name: "Settings" })).toBeVisible();
});

test("the maker opens directly from its address", async ({ page }) => {
  await page.goto("/make");
  await expect(page.getByRole("form", { name: "Settings" })).toBeVisible();
});

test("a photo shows up on the cover, with the label on top", async ({
  page,
}) => {
  await page.goto("/make");
  await addPhoto(page);
  await expect(page.getByText("photo.png")).toBeVisible();
  await expect(page.locator("#zoom")).toBeEnabled();
  // Inside the blue disc of the test photo.
  await expect.poll(() => pixel(page, 0.66, 0.33)).toEqual([40, 80, 200]);
  // The label's area is almost all black and white...
  await expect.poll(() => labelShare(page)).toBeGreaterThan(0.75);
  // ...and once it is switched off, the orange photo shows through.
  await page.locator("#pa-show").uncheck();
  await expect.poll(() => labelShare(page)).toBeLessThan(0.05);
});

test("exports a 3000 × 2000 record mock-up as a JPEG", async ({ page }) => {
  await page.goto("/make");
  await addPhoto(page);
  await page.locator("#main-title").fill("Sleepless Nights");
  await page.locator("#subtitle").fill("Alexa");
  const record = await exportFile(page, "Record");
  expect(record.name).toBe("sleepless-nights-alexa-record-3000x2000.jpeg");
  expect(record.file.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(jpegSize(record.file)).toEqual({ height: 2000, width: 3000 });
});

test("the record's backdrop takes the photo's main colour", async ({
  page,
}) => {
  await page.goto("/make");
  const corner = () =>
    page
      .locator(".record-frame canvas")
      .evaluate((canvas: HTMLCanvasElement) =>
        [
          ...(canvas.getContext("2d")?.getImageData(2, 2, 1, 1).data ?? []),
        ].slice(0, 3)
      );
  // Before a photo: the placeholder art's dark green.
  await expect.poll(corner).toEqual([0x3b, 0x4a, 0x42]);
  await addPhoto(page);
  // After: the test photo's warm orange, not its blue disc.
  await expect
    .poll(async () => {
      const [r, g, b] = await corner();
      return r > g && g > b && r > 190;
    })
    .toBe(true);
});

test("I'm feeling lucky redraws the cover with its new picks", async ({
  page,
}) => {
  // Every roll lands on the last choice: an XXL label, bottom right.
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await page.goto("/make");
  await addPhoto(page);
  await expect.poll(() => labelShare(page)).toBeGreaterThan(0.75);
  await page.getByRole("button", { name: "I'm feeling lucky" }).click();
  await expect
    .poll(() => labelShare(page, "bottom-right", 0.2))
    .toBeGreaterThan(0.75);
  await expect.poll(() => labelShare(page)).toBeLessThan(0.05);
});

test("dragging the title snaps it to one of nine spots", async ({ page }) => {
  await page.goto("/make");
  const box = await page.locator(".cover-frame canvas").boundingBox();
  if (!box) {
    throw new Error("no cover preview");
  }
  const at = (fx: number, fy: number) =>
    [box.x + box.width * fx, box.y + box.height * fy] as const;
  /** Whether the text sits at a spot, going by the two position groups. */
  const atSpot = async (row: string, column: string) => {
    const pressed = (group: string) =>
      page
        .getByRole("group", { name: group })
        .locator('[aria-pressed="true"]')
        .textContent();
    return (
      [
        await pressed("Vertical position"),
        await pressed("Horizontal position"),
      ].join(" ") === `${row} ${column}`
    );
  };

  // The default title sits bottom left; grab it there.
  await page.mouse.move(...at(0.2, 0.86));
  await page.mouse.down();
  await page.mouse.move(...at(0.5, 0.5), { steps: 4 });
  await expect(page.locator(".spot-grid")).toBeVisible();
  await expect.poll(() => atSpot("middle", "center")).toBe(true);
  await page.mouse.move(...at(0.85, 0.15), { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => atSpot("top", "right")).toBe(true);
  await expect(page.locator(".spot-grid")).toHaveCount(0);
});

test("exports a 3000 × 3000 cover and a 1080 × 1440 player", async ({
  page,
}) => {
  await page.goto("/make");
  await addPhoto(page);
  await page.locator("#main-title").fill("Sleepless Nights");
  await page.locator("#subtitle").fill("Alexa");

  const cover = await exportFile(page, "Cover");
  expect(cover.name).toBe("sleepless-nights-alexa-cover-3000.png");
  expect(pngSize(cover.file)).toEqual({ height: 3000, width: 3000 });

  const player = await exportFile(page, "Player");
  expect(player.name).toBe("sleepless-nights-alexa-player-1080x1440.png");
  expect(pngSize(player.file)).toEqual({ height: 1440, width: 1080 });
});

test("picking a pairing loads both its fonts from the site", async ({
  page,
}) => {
  await page.goto("/make");
  const combo = page
    .locator(".combo")
    .filter({ has: page.locator(".combo-name", { hasText: /^Cinzel$/u }) });
  await combo.scrollIntoViewIfNeeded();
  await combo.click();
  await expect(page.locator("#title-font")).toHaveText("Cinzel");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.fonts.check('40px "Cinzel"') &&
          document.fonts.check('40px "Fauna One"')
      )
    )
    .toBe(true);
});

test("each font in the menu is written in its own font", async ({ page }) => {
  await page.goto("/make");
  await page.getByRole("button", { exact: true, name: "Title font" }).click();
  const list = page.getByRole("listbox", { exact: true, name: "Title font" });
  await expect(list).toBeVisible();
  for (const name of [
    "Abril Fatface",
    "Fugaz One",
    "Space Mono",
    "Grand Hotel",
  ]) {
    const option = list.getByRole("option", { exact: true, name });
    const family = await option.evaluate(
      (el) => getComputedStyle(el).fontFamily
    );
    expect(family.startsWith(`"${name}"`)).toBe(true);
    // ...and the font itself has loaded, so it isn't the fallback showing.
    await expect
      .poll(() =>
        page.evaluate((n) => document.fonts.check(`16px "${n}"`), name)
      )
      .toBe(true);
  }
  await list.getByRole("option", { name: "Grand Hotel" }).click();
  await expect(page.locator("#title-font")).toHaveText("Grand Hotel");
  await expect(list).toBeHidden();
});

test("never contacts another site, photo and fonts included", async ({
  page,
}) => {
  const elsewhere = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.host !== "localhost:4173") {
      elsewhere.add(url.host);
    }
  });
  await page.goto("/");
  await page.getByRole("link", { exact: true, name: "start making" }).click();
  await addPhoto(page);
  for (const name of ["Grand Hotel", "DotGothic16", "Sacramento"]) {
    const combo = page.locator(".combo").filter({
      has: page.locator(".combo-name", {
        hasText: new RegExp(`^${name}$`, "u"),
      }),
    });
    await combo.scrollIntoViewIfNeeded();
    await combo.click();
  }
  await exportFile(page, "Cover");
  expect([...elsewhere]).toEqual([]);
});

for (const path of ["/", "/make"]) {
  test(`${path} fits a phone screen without sideways scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
