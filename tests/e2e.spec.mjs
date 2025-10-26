import { chromium, expect, test } from "@playwright/test";
import { createServer } from "http";
import { mkdir, mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist");
const fixturesDir = path.join(repoRoot, "tests", "fixtures");
const screenshotsDir = path.join(repoRoot, "artifacts", "screenshots");

async function startFixtureServer() {
  const html = await readFile(path.join(fixturesDir, "test.html"));
  const xml = await readFile(path.join(fixturesDir, "test.xml"));

  const server = createServer((req, res) => {
    if (!req.url || req.url === "/" || req.url === "/test.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.url === "/test.xml") {
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      res.end(xml);
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind local fixture server.");
  }

  return {
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function captureScreenshot(page, name) {
  if (!page) return;
  await mkdir(screenshotsDir, { recursive: true });
  const filename = `${sanitizeFilename(name)}.png`;
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
}

test("intercepts XML download and renders preview", async () => {
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

  let page;
  let viewerPage;

  try {
    page = await context.newPage();
    await page.goto(`http://test.odoo.com:${port}/test.html`, {
      waitUntil: "domcontentloaded",
    });

    const viewerPromise = context.waitForEvent("page", {
      timeout: 20000,
    }).catch(() => {
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
    await expect(viewerPage.getByText("Prodotto demo")).toBeVisible();

    await captureScreenshot(viewerPage, "preview-success");
  } catch (error) {
    const targetPage = viewerPage || page;
    await captureScreenshot(targetPage, "preview-failure");
    throw error;
  } finally {
    await context.close();
    await close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
