import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  outputDir: "artifacts/test-results",
  reporter: [
    ["dot"],
    ["github"],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
});
