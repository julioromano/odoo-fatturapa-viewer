# odoo-fatturapa-viewer
Chrome extension that allows to quickly preview any FatturaPa XML file attached to an Odoo invoice or vendor bill.

## Development
TypeScript sources live in `src/` and compile into `dist/`.
Static extension assets live in `public/` and are copied into `dist/` on build.
`manifest.json` is copied into `dist/` as part of the build.
Load the extension from `dist/`, so rebuild after changes.

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
