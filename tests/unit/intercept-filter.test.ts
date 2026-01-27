import { describe, expect, it } from "vitest";

import {
  containsFatturaHeader,
  isAllowedExtension,
  isAllowedMime,
  requiresHeaderSniff,
  shouldHandleInvoice,
} from "../../src/intercept-filter";

const encoder = new TextEncoder();
const fatturaXml = "<FatturaElettronicaHeader></FatturaElettronicaHeader>";
const nonFatturaXml = "<root></root>";

describe("intercept filter", () => {
  it("allows fattura mime types", () => {
    expect(isAllowedMime("application/xml")).toBe(true);
    expect(isAllowedMime("application/pkcs7-mime")).toBe(true);
    expect(isAllowedMime("application/octet-stream")).toBe(true);
  });

  it("rejects unrelated mime types", () => {
    expect(isAllowedMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(
      false,
    );
    expect(isAllowedMime("text/xml")).toBe(false);
    expect(isAllowedMime("")).toBe(false);
  });

  it("allows xml and xml.p7m extensions", () => {
    expect(isAllowedExtension("IT03378350981_1000X.xml")).toBe(true);
    expect(isAllowedExtension("IT03378350981_1000X.xml.p7m")).toBe(true);
    expect(isAllowedExtension("invoice.xlsx")).toBe(false);
  });

  it("detects fattura header", () => {
    expect(containsFatturaHeader(fatturaXml)).toBe(true);
    expect(containsFatturaHeader(nonFatturaXml)).toBe(false);
  });

  it("handles xml with fattura header", () => {
    const bytes = encoder.encode(fatturaXml).buffer;
    expect(shouldHandleInvoice("application/xml", "invoice.xml", bytes)).toBe(true);
  });

  it("rejects xml without fattura header", () => {
    const bytes = encoder.encode(nonFatturaXml).buffer;
    expect(shouldHandleInvoice("application/xml", "invoice.xml", bytes)).toBe(false);
  });

  it("allows xml.p7m without header sniff", () => {
    expect(shouldHandleInvoice("application/pkcs7-mime", "invoice.xml.p7m")).toBe(true);
  });

  it("requires header sniff only for plain xml", () => {
    expect(requiresHeaderSniff("invoice.xml")).toBe(true);
    expect(requiresHeaderSniff("invoice.xml.p7m")).toBe(false);
  });
});
