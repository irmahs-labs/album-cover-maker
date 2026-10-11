import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Tests read the generated font-faces.css to check it covers every family.
  test: { css: { include: [/font-faces\.css/u] } },
});
