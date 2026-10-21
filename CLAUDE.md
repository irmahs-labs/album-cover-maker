# CLAUDE.md

## Git branches

Always pull before making changes: run `git fetch origin` and start from the latest `origin/main` before the first edit.

- On a branch whose PR is open, bring it up to date with `origin/main` first
- On `main`, or on a branch whose PR is already merged, create a new branch from `origin/main` instead

Always name the branch after the feature or fix it contains, never a random or generated name.

- Format: `<type>/<feature-name>` in lowercase kebab-case
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`
- Examples: `feat/cover-templates`, `fix/export-blur`, `docs/claude-md`
- If the session assigns a generic branch (for example `claude/<random-words>`), create a feature-named branch instead and push there

## Pull requests

- Never push to `main`. Every change goes in through a pull request.
- Open the PR and stop there: never merge it, not even when CI is green. Irma reviews and clicks merge.
- Deploys run on merge to `main`. Re-run a deploy only when Irma asks.

## Checks before pushing

```sh
npm run check     # Ultracite (oxlint + oxfmt); CI fails on it
npm run typecheck # app and end-to-end tests
npm test          # vitest
npm run build
npm run test:e2e  # Playwright, when a change touches what the browser shows
```

The PostToolUse hook in `.claude/hooks/ultracite.sh` runs Ultracite and the typecheck on every file you edit.

## Design

The app is the one Cute Matcha's _Apps_ section was drawn from, and it works in both of the system's themes: Light Matcha, and Dark Matcha, which is green tea (a mid-tone matcha page, cards a step lighter, the header, buttons and fields a darker well, near-black outlines and shadows). Colours are its role tokens, named by job (`ground`, `panel`, `header`, `raised`, `text`, `text-muted`, `accent`, `on-accent`, `strong`, `selected`, …), at the top of `src/styles.css`: Light Matcha on `:root`, Dark Matcha on `:root[data-theme="dark"]`. Pick a token by what the thing is, never a hex: the primary pill is `accent`, a chosen option, combo, font or switch is `selected`, legends, title bars and the export button are `strong`. Every surface sets its own text: `text` on `panel` and `raised`, `on-accent` on `accent` (the lime windows), `on-strong` on `strong`, `on-selected` on `selected`. The inline script in `index.html` sets `data-theme` before the first paint, from the visitor's saved choice or else the device's setting; `src/lib/theme.ts` keeps it, and the header's sun/moon pill saves a choice. The cover, the record and the player mock-up are artwork and keep their own colours.

The app's own type is Fredoka (the name, titles, legends, window names) and Nunito Sans (everything else), self-hosted like the cover fonts: they're the `UI` families in `scripts/font-faces.mjs`. The header ends with the **account pill** (`src/components/account-button.tsx`): "sign in" with Google's mark, or the person's picture and first name, linking to the IrmaHS Labs account page. It asks `auth.irmahs.dev` who is signed in from the browser (`src/lib/session.ts`); that check is the one request allowed to leave the site, and the end-to-end test allows exactly it.
