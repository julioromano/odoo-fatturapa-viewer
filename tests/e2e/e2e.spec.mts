/**
 * End-to-end tests for the Odoo FatturaPA Viewer extension.
 * 
 * Tests the extension's ability to intercept XML and P7M (PKCS#7 signed) file downloads
 * and render previews in a viewer window.
 * 
 * @remarks
 * - Uses Playwright to launch a persistent Chrome context with the extension loaded
 * - Sets up a local fixture server to serve test HTML and XML files
 * - Verifies that clicking the download button opens the viewer with correct content
 * - Captures screenshots for both regular XML and signed P7M files
 * 
 * @see {@link runPreviewTest} for the main test execution flow
 * @see {@link startFixtureServer} for fixture server setup
 */
import { chromium, expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");
const fixturesDir = path.join(repoRoot, "tests", "fixtures");
const screenshotsDir = path.join(repoRoot, "artifacts", "screenshots");

type FixtureServer = {
  port: number;
  close: () => Promise<void>;
};

async function startFixtureServer(): Promise<FixtureServer> {
  const html = await readFile(path.join(fixturesDir, "test.html"));
  const htmlP7m = await readFile(path.join(fixturesDir, "test-p7m.html"));
  const xml = await readFile(path.join(fixturesDir, "test.xml"));
  const xmlP7m = await readFile(path.join(fixturesDir, "test.xml.p7m"));

  const server = createServer((req, res) => {
    if (!req.url || req.url === "/" || req.url === "/test.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.url === "/test-p7m.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlP7m);
      return;
    }
    if (req.url === "/test.xml") {
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      res.end(xml);
      return;
    }
    if (req.url === "/test.xml.p7m") {
      res.writeHead(200, { "Content-Type": "application/pkcs7-mime" });
      res.end(xmlP7m);
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind local fixture server.");
  }

  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

function sanitizeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function captureScreenshot(page: Page | undefined, name: string): Promise<void> {
  if (!page) return;
  await mkdir(screenshotsDir, { recursive: true });
  const filename = `${sanitizeFilename(name)}.png`;
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
}

type PreviewOptions = {
  fixturePath: string;
  screenshotName: string;
};

/**
 * Executes an end-to-end preview test by launching a persistent browser context with the extension loaded.
 * 
 * This function sets up an isolated browser environment to test the extension's viewer functionality in a
 * controlled manner. It manages the complete lifecycle of the test including server startup, browser context
 * creation, extension loading, and cleanup to ensure tests are reproducible and don't leave artifacts behind.
 * 
 * The persistent context approach allows the extension to maintain state across pages, simulating real user
 * behavior where the extension remains active throughout the browser session. Temporary directories and processes
 * are explicitly managed and cleaned up to prevent resource leaks and ensure test isolation.
 * 
 * @param options - Configuration for the preview test, including fixture path and screenshot name
 * @param run - Callback function executed once the viewer page has fully loaded and rendered content
 * @throws {Error} When the viewer window fails to open, the extension isn't properly loaded, or the test callback throws
 */
async function runPreviewTest(
  options: PreviewOptions,
  run: (viewerPage: Page) => Promise<void>
): Promise<void> {
  const userDataDir = await mkdtemp(
    path.join(os.tmpdir(), "odoo-fatturapa-e2e-")
  );
  const { port, close } = await startFixtureServer();
  const headless = process.env.HEADLESS === "1";

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      `--disable-extensions-except=${distRoot}`,
      `--load-extension=${distRoot}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-features=TranslateUI",
      "--disable-background-networking",
      "--disable-sync",
      "--metrics-recording-only",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-popup-blocking",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-ipc-flooding-protection",
      "--password-store=basic",
      `--host-resolver-rules=MAP test.odoo.com 127.0.0.1`,
    ],
  });

  let page: Page | undefined;
  let viewerPage: Page | undefined;

  try {
    page = await context.newPage();
    await page.goto(`http://test.odoo.com:${port}/${options.fixturePath}`, {
      waitUntil: "domcontentloaded",
    });

    const viewerPromise = context
      .waitForEvent("page", {
        timeout: 20000,
      })
      .catch(() => {
        throw new Error(
          "Viewer window did not open. Ensure extensions are enabled; headless mode often blocks extension loading."
        );
      });
    await page.click("#download");

    viewerPage = await viewerPromise;
    await viewerPage.waitForURL(/viewer\.html/);
    await viewerPage.waitForFunction(() => {
      const status = document.getElementById("status");
      const out = document.getElementById("out");
      return Boolean(status && status.textContent === "" && out?.children.length);
    });
    await run(viewerPage);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    throw new Error(`Preview flow failed for ${options.fixturePath}: ${details}`);
  } finally {
    await captureScreenshot(viewerPage || page, options.screenshotName);
    await context.close();
    await close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

test("intercepts XML download and renders preview", async () => {
  await runPreviewTest(
    {
      fixturePath: "test.html",
      screenshotName: "preview",
    },
    async (viewerPage) => {
      await expect(viewerPage.getByText("Prodotto demo")).toBeVisible();
    }
  );
});

test("intercepts XML.P7M download and renders preview", async () => {
  await runPreviewTest(
    {
      fixturePath: "test-p7m.html",
      screenshotName: "preview-p7m",
    },
    async (viewerPage) => {
      await expect(viewerPage.getByText("Prodotto demo")).toBeVisible();
    }
  );
});
