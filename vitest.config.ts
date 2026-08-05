import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    includeSource: ["src/**/*.{js,ts}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      reporter: ["json-summary", "json"],
      reportOnFailure: true,
    },
  },
});
