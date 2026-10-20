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
npm run lint      # typecheck, app and end-to-end tests
npm test          # vitest
npm run build
npm run test:e2e  # Playwright, when a change touches what the browser shows
```

The PostToolUse hook in `.claude/hooks/ultracite.sh` runs Ultracite and the typecheck on every file you edit.

## Design

The app is the one Cute Matcha's _Apps_ section was drawn from, and it works in both of the system's themes. Colours are its role tokens, named by job (`ground`, `panel`, `raised`, `text`, `text-muted`, `strong`, `on-strong`, `accent`, `on-accent`, …), at the top of `src/styles.css`: Light Matcha on `:root`, Dark Matcha on `:root[data-theme="dark"]`. Pick a token by what the thing is, never a hex. Every surface sets its own text: `text` on `panel` and `raised`, `on-accent` on `accent` (the lime windows), `on-strong` on `strong`. The inline script in `index.html` sets `data-theme` before the first paint, from the visitor's saved choice or else the device's setting; `src/lib/theme.ts` keeps it, and the header's sun/moon pill saves a choice. The cover, the record and the player mock-up are artwork and keep their own colours.
