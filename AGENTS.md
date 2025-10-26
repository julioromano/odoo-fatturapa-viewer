# Repository Guidelines

## Project Structure & Module Organization
This repository is a Chrome extension that previews FatturaPA XML files from Odoo.
- `manifest.json` defines extension metadata, permissions, and entry points.
- `src/` contains TypeScript sources (background, popup, content, intercept, viewer, allowlist).
- `public/` contains static assets (`viewer.html`, `viewer.css`, `popup.html`, `popup.css`, XSLT, icons).
- `tests/` holds Playwright E2E coverage and fixtures.
- `dist/` is the compiled output used by Chrome; it is generated.
- `artifacts/` stores Playwright HTML reports and screenshots.

## Build, Test, and Development Commands
- TypeScript build: `npm run build` (compiles to `dist/`, copies static files, and copies `manifest.json`).
- Clean build output: `npm run clean` (or `npm run build:clean`).
- Type check: `npm run typecheck`.
- Watch build: `npm run watch`.
- E2E tests: `npm run test:e2e` (builds and runs Playwright; install via `npx playwright install chromium`).
- Load the extension in Chrome: open `chrome://extensions`, enable Developer Mode, then “Load unpacked” and select the `dist/` folder.
- For a quick edit/test loop, reload the extension from `chrome://extensions` after rebuilding or editing `dist/`.

## Coding Style & Naming Conventions
- TypeScript and CSS in this repo use 2-space indentation.
- Keep file names descriptive and lower-case (e.g., `viewer.js`, `viewer.css`).
- Prefer clear, direct function names that reflect UI or XML behavior (e.g., `triggerDownload`).
- There is no automated formatter or linter configured; keep changes consistent with existing patterns.

## Testing Guidelines
- Playwright E2E tests live in `tests/` and output reports to `artifacts/`.
- Manual checks: load the extension and verify XML preview works for both intercepted downloads and direct `viewer.html?u=...` flows.

## Commit & Pull Request Guidelines
- Git history shows simple, sentence-style commit messages. Use short, descriptive messages that state what changed.
- For pull requests, include:
  - a short summary of the behavior change,
  - the files or flows touched (e.g., “intercepted download path”),
  - screenshots or screen recordings if the UI output changes.

## Release Checklist
- Verify the extension loads cleanly in Chrome and the preview renders for a known XML.
- Confirm `manifest.json` version changes if you are publishing a new build.
- Re-check permissions in `manifest.json` match the release scope.

## Security & Configuration Notes
- Be mindful of `manifest.json` permissions; only add new ones if required.
- Avoid logging sensitive XML data to the console in production changes.
