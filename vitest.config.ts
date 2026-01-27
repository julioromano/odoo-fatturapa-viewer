import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e.spec.mjs"],
    reporters: ["default", "github-actions"],
    coverage: {
      provider: "v8",
      reportsDirectory: "artifacts/coverage",
      reporter: ["text", "html", "lcov"],
      exclude: ["tests/", "dist/", "public/", "*.config.ts"],
    },
  },
});
