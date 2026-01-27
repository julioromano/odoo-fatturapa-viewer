import { describe, expect, it } from "vitest";

import { getDownloadState, normalizeSignedFilename } from "../../src/viewer-logic";

describe("viewer logic", () => {
  it("normalizes signed filenames to .xml", () => {
    expect(normalizeSignedFilename("invoice.xml.p7m")).toBe("invoice.xml");
    expect(normalizeSignedFilename("invoice.p7m")).toBe("invoice.xml");
    expect(normalizeSignedFilename("invoice.XML.P7M")).toBe("invoice.XML");
  });

  it("enables xml download after successful load", () => {
    const state = getDownloadState({
      xmlContent: "<FatturaElettronicaHeader/>",
      originalFilename: "invoice.xml",
      originalB64: "abc",
      hadError: false,
    });
    expect(state).toEqual({ mode: "xml", label: "Download anyway" });
  });

  it("offers p7m fallback when signed extraction fails", () => {
    const state = getDownloadState({
      xmlContent: null,
      originalFilename: "invoice.xml.p7m",
      originalB64: "abc",
      hadError: true,
    });
    expect(state).toEqual({ mode: "p7m", label: "Download original .p7m" });
  });

  it("keeps download disabled when error is not on signed payload", () => {
    const state = getDownloadState({
      xmlContent: null,
      originalFilename: "invoice.xml",
      originalB64: "abc",
      hadError: true,
    });
    expect(state).toEqual({ mode: null, label: null });
  });
});
