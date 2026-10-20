import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    // Written by `npm run fonts` from the Fontsource CSS, and kept exactly as
    // generated so that re-running it changes nothing.
    "src/font-faces.css",
  ],
});
