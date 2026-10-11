import { defineConfig, devices } from "@playwright/test";

// End-to-end tests in a real Chromium against the production build.
// Run with `npm run test:e2e` (it builds first).
export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: process.env.CI ? "github" : "list",
  retries: 0,
  testDir: "e2e",
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "npx vite build && npx vite preview --port 4173 --strictPort",
    reuseExistingServer: !process.env.CI,
    url: "http://localhost:4173",
  },
});
