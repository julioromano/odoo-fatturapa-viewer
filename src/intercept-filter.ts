const ALLOWED_MIME_TYPES = new Set([
  "application/xml",
  "application/pkcs7-mime",
  "application/octet-stream", // Odoo bug: recent incoming invoices from other Odoo instances use this.
]);

export function isAllowedMime(mime: string): boolean {
  if (!mime) return false;
  return ALLOWED_MIME_TYPES.has(mime.toLowerCase());
}

export function isAllowedExtension(filename: string): boolean {
  return /\.xml(\.p7m)?$/i.test(filename);
}

export function requiresHeaderSniff(filename: string): boolean {
  return /\.xml$/i.test(filename);
}

export function containsFatturaHeader(xmlText: string): boolean {
  return xmlText.includes("<FatturaElettronicaHeader");
}

export function shouldHandleInvoice(
  mime: string,
  filename: string,
  bytes?: ArrayBuffer
): boolean {
  if (!isAllowedMime(mime)) return false;
  if (!isAllowedExtension(filename)) return false;

  // Only plain XML is sniffed; .xml.p7m is PKCS7 binary.
  if (!requiresHeaderSniff(filename)) return true;
  if (!bytes) return false;

  const xmlText = new TextDecoder().decode(bytes);
  return containsFatturaHeader(xmlText);
}
