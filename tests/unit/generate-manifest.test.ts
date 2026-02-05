import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(process.cwd(), "scripts", "generate-manifest.ts");

const runScript = (cwd: string, env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    env: {
      ...process.env,
      ...env,
      NODE_OPTIONS: "--no-warnings",
    },
    encoding: "utf8",
  });

const createTempDir = async () => mkdtemp(path.join(os.tmpdir(), "odoo-fatturapa-viewer-"));

describe("generate-manifest script", () => {
  it("replaces the __VERSION__ placeholder and writes dist/manifest.json", async () => {
    const cwd = await createTempDir();
    const manifest = {
      manifest_version: 3,
      name: "Test Extension",
      version: "__VERSION__",
    };
    await writeFile(path.join(cwd, "manifest.template.json"), JSON.stringify(manifest, null, 2));

    const result = runScript(cwd, { VERSION: "1.2.3" });
    expect(result.status).toBe(0);

    const output = await readFile(path.join(cwd, "dist", "manifest.json"), "utf8");
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.version).toBe("1.2.3");
  });

  it("overwrites the version when no placeholder is present", async () => {
    const cwd = await createTempDir();
    const manifest = {
      manifest_version: 3,
      name: "Test Extension",
      version: "0.0.0",
    };
    await writeFile(path.join(cwd, "manifest.template.json"), JSON.stringify(manifest, null, 2));

    const result = runScript(cwd, { VERSION: "2.0.0" });
    expect(result.status).toBe(0);

    const output = await readFile(path.join(cwd, "dist", "manifest.json"), "utf8");
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.version).toBe("2.0.0");
  });

  it("fails with a clear message when the template file is missing", async () => {
    const cwd = await createTempDir();
    const result = runScript(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Failed to read manifest.template.json");
  });

  it("fails with a clear message when the template JSON is invalid", async () => {
    const cwd = await createTempDir();
    await writeFile(path.join(cwd, "manifest.template.json"), "{");

    const result = runScript(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Invalid JSON in manifest.template.json");
  });

  it("fails with a clear message when the output cannot be written", async () => {
    const cwd = await createTempDir();
    const manifest = {
      manifest_version: 3,
      name: "Test Extension",
      version: "0.0.0",
    };
    await writeFile(path.join(cwd, "manifest.template.json"), JSON.stringify(manifest, null, 2));
    await writeFile(path.join(cwd, "dist"), "not a directory");

    const result = runScript(cwd, { VERSION: "1.2.3" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Failed to write manifest.json");
  });
});
