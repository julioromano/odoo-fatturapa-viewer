import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { extractPkcs7Content } from "../../src/pkcs7";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "..", "fixtures");

describe("pkcs7 extraction", () => {
  it("extracts embedded XML from .p7m fixture", async () => {
    const p7m = await readFile(path.join(fixturesDir, "test.xml.p7m"));
    const xml = extractPkcs7Content(p7m.toString("base64"));
    expect(xml).toContain("<FatturaElettronicaHeader");
    expect(xml).toContain("<FatturaElettronicaBody");
  });
});
