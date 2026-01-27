/**
 * FatturaPA signed invoices use the `.xml.p7m` extension, so other `.p7m`
 * files are treated as non-invoice payloads.
 */
export function isSignedXmlP7m(filename: string): boolean {
  return /\.xml\.p7m$/i.test(filename);
}
