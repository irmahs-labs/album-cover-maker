import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Tests read the generated font-faces.css to check it covers every family.
    css: { include: [/font-faces\.css/u] },
    // e2e/ holds the Playwright tests, run by `npm run test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
