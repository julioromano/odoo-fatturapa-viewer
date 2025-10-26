const config = {
  testDir: "tests",
  timeout: 60000,
  outputDir: "artifacts/test-results",
  reporter: [["github"], ["html", { open: "never", outputFolder: "artifacts/playwright-report" }]],
};

module.exports = config;
