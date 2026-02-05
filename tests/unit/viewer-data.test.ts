import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  assertSignedInvoiceXml,
  decodeBase64ToBytes,
  decodeBase64ToText,
  resolveXmlPayload,
} from "../../src/viewer-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "..", "fixtures");

describe("viewer data helpers", () => {
  it("decodes base64 to bytes and text", () => {
    const input = "Hello XML";
    const b64 = Buffer.from(input, "utf8").toString("base64");
    const bytes = decodeBase64ToBytes(b64);
    expect(Array.from(bytes)).toEqual(Array.from(Buffer.from(input, "utf8")));
    expect(decodeBase64ToText(b64)).toBe(input);
  });

  it("rejects signed payloads without invoice header", () => {
    expect(() => assertSignedInvoiceXml("<Root/>")).toThrow(
      "Signed XML is not a FatturaPA invoice.",
    );
  });

  it("resolves unsigned XML payloads without changing filename", async () => {
    const xml = await readFile(path.join(fixturesDir, "test.xml"));
    const b64 = xml.toString("base64");
    const result = resolveXmlPayload({ b64, filename: "invoice.xml" });
    expect(result.filename).toBe("invoice.xml");
    expect(result.xmlContent).toContain("<FatturaElettronicaHeader");
  });

  it("resolves signed XML payloads and normalizes filename", async () => {
    const p7m = await readFile(path.join(fixturesDir, "test.xml.p7m"));
    const result = resolveXmlPayload({
      b64: p7m.toString("base64"),
      filename: "invoice.xml.p7m",
    });
    expect(result.filename).toBe("invoice.xml");
    expect(result.xmlContent).toContain("<FatturaElettronicaHeader");
  });
});
