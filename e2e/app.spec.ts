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
/** Share of the top-left label area (10% wide, 1.6 : 1, 3.5% in) that is black or white. */
const labelShare = (page: Page) =>
  page.locator(".cover-frame canvas").evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    const at = (f: number) => Math.round(canvas.width * f);
    const data =
      ctx?.getImageData(at(0.035), at(0.035), at(0.1), at(0.0625)).data ?? [];
    let plain = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const grey = Math.max(r, g, b) - Math.min(r, g, b) < 24;
      if (grey && (r < 70 || r > 185)) {
        plain += 1;
      }
    }
    return plain / (data.length / 4);
  });

const exportFile = async (page: Page, button: string) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(".export", { hasText: button }).click(),
  ]);
  const path = await download.path();
  return { name: download.suggestedFilename(), file: await readFile(path) };
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
  await expect(page.locator("#title-font")).toHaveValue("Cinzel");
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
