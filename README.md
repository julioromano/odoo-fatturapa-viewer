# odoo-fatturapa-viewer
Chrome extension that allows to quickly preview any FatturaPa XML file attached to an Odoo invoice or vendor bill.

## Development
TypeScript sources live in `src/` and compile into `dist/`.
Static extension assets live in `public/` and are copied into `dist/` on build.
`manifest.template.json` is used to generate `dist/manifest.json` as part of the build.
Load the extension from `dist/`, so rebuild after changes.
`package.json` uses a `0.0.0-dev` placeholder; release builds take the version from git tags.
Release tags can include pre-release suffixes (e.g. `v1.2.3-rc.1`), but those are for GitHub releases only and should not be published to the Chrome Web Store. `manifest.json` uses the numeric `1.2.3` because Chrome requires integer-only version segments; the ZIP name keeps the full tag.

Build once:
```
npm install
npm run build
```

Clean build:
```
npm run build:clean
```

Watch:
```
npm run watch
```

E2E test (builds, launches Chromium with the extension, captures a screenshot):
```
npx playwright install chromium
npm run test:e2e
```

Run headless (extensions may not work in headless mode):
```
HEADLESS=1 npm run test:e2e
```

Playwright HTML report output:
```
artifacts/playwright-report/
```
