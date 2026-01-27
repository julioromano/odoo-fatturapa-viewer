import { isSignedXmlP7m } from "./filename";
import { extractPkcs7Content } from "./pkcs7";
import { normalizeSignedFilename } from "./viewer-logic";

export function decodeBase64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    return Uint8Array.from(bin, (char) => char.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

export function decodeBase64ToText(b64: string): string {
  return new TextDecoder().decode(decodeBase64ToBytes(b64));
}

export function assertSignedInvoiceXml(xmlContent: string): void {
  if (!xmlContent.includes("<FatturaElettronicaHeader")) {
    throw new Error("Signed XML is not a FatturaPA invoice.");
  }
}

export function resolveXmlPayload(input: {
  b64: string;
  filename: string;
}): { xmlContent: string; filename: string } {
  if (isSignedXmlP7m(input.filename)) {
    const xmlContent = extractPkcs7Content(input.b64);
    assertSignedInvoiceXml(xmlContent);
    return {
      xmlContent,
      filename: normalizeSignedFilename(input.filename),
    };
  }
  return {
    xmlContent: decodeBase64ToText(input.b64),
    filename: input.filename,
  };
}
