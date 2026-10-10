# Album Cover Maker by Irma HS

Make an album cover in the browser: drop in a photo, add a title, pick a font and colour combo, and export a 3000 × 3000 cover PNG plus a 1080 × 1440 music player mock-up. No sign-up or login, and photos never leave the browser.

Design: the "Cover maker: edit screen" artboard of the Cute Matcha design canvas.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173  (landing at /, maker at /make)
npm test           # unit tests (vitest)
npm run lint       # typecheck
npm run check      # Ultracite: oxlint + anti-slop, oxfmt (report only)
npm run fix        # the same, fixing and formatting what it can
npm run build      # outputs dist/
```

## Layout

- `src/components/landing.tsx`: the landing page
- `src/components/maker.tsx`: the cover maker
- `src/lib/render.ts`: draws the cover and player on a canvas; the previews and the PNG exports share it, so what you see is what you download
- `src/lib/combos.ts`, `src/lib/color.ts`: combo suggestions from the photo's colours
- `.claude/hooks/session-start.sh`: installs dependencies when a Claude Code cloud session starts

## Deploy

Pushing to `main` deploys to `/srv/album-cover-maker` on the irmahs.dev server, served at https://album-cover-maker.irmahs.dev through [irmahs-labs/proxy](https://github.com/irmahs-labs/proxy). One-time setup (DNS, server folder, proxy route) is in [DEPLOY.md](DEPLOY.md).
