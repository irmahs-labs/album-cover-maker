# Album Cover Maker by Irma HS

Make an album cover in the browser: drop in a photo, add a title, pick a font and colour combo, and export a 3000 × 3000 cover PNG plus a 1080 × 1440 music player mock-up. No sign-up or login, and photos never leave the browser.

Design: the "Cover maker: edit screen" artboard of the Cute Matcha design canvas.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173  (landing at /, maker at /make)
npm test           # unit, drawing and screen tests (vitest)
npm run test:e2e   # end-to-end tests in Chromium (Playwright; builds first)
npm run typecheck  # app and end-to-end tests
npm run check      # Ultracite: oxlint + anti-slop, oxfmt (report only)
npm run fix        # the same, fixing and formatting what it can
npm run build      # outputs dist/
```

## Layout

- `src/components/landing.tsx`: the landing page
- `src/components/maker.tsx`: the cover maker
- `src/lib/render.ts`: draws the cover and player on a canvas; the previews and the PNG exports share it, so what you see is what you download
- `src/lib/combos.ts`, `src/lib/color.ts`: combo suggestions from the photo's colours
- `src/lib/fonts.ts`: `PAIRS`, every title + subtitle font pairing; the combos and font menus are built from it
- `src/font-faces.css`: generated `@font-face` rules for those fonts (see below)
- `.claude/hooks/session-start.sh`: installs dependencies when a Claude Code cloud session starts

## Tests

- `src/lib/*.test.ts`: colours, combos, fonts, and the cover and player drawing, checked through a fake canvas (`src/lib/fake-canvas.ts`) that records every draw call
- `src/components/*.test.tsx`, `src/router.test.ts`: the landing page, the maker's controls and the router, in jsdom with Testing Library
- `e2e/`: Playwright in a real Chromium against the production build: photo on the cover, the label drawn and hidden, real 3000 × 3000 and 1080 × 1440 PNG exports, fonts loading, no requests to any other site, and no sideways scrolling on a phone

The first time, run `npx playwright install chromium`. CI runs all of them in the required `checks` job.

## Fonts

Fonts are served with the site from the [Fontsource](https://fontsource.org) npm packages, so visitors' browsers never contact Google. All of them are under the SIL Open Font License.

To add a pairing:

1. Add it to `PAIRS` in `src/lib/fonts.ts`.
2. Install any new family: `npm install @fontsource/<name-in-kebab-case>` (for example `@fontsource/abril-fatface`).
3. Run `npm run fonts` to regenerate `src/font-faces.css`, and commit both.

A test fails if a family in `PAIRS` has no font face, so a forgotten step 3 shows up in CI.

## Deploy

Pushing to `main` deploys to `/srv/album-cover-maker` on the irmahs.dev server, served at https://album-cover-maker.irmahs.dev through [irmahs-labs/proxy](https://github.com/irmahs-labs/proxy). One-time setup (DNS, server folder, proxy route) is in [DEPLOY.md](DEPLOY.md).
