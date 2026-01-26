import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractPkcs7Content } from "../../src/pkcs7";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures");

describe("pkcs7 extraction", () => {
  it("extracts embedded XML from .p7m fixture", async () => {
    const p7m = await readFile(path.join(fixturesDir, "test.xml.p7m"));
    const xml = extractPkcs7Content(new Uint8Array(p7m));
    expect(xml).toContain("<FatturaElettronicaHeader>");
    expect(xml).toContain("<FatturaElettronicaBody>");
  });
});
