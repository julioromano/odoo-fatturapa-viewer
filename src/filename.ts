/**
 * We only treat `.xml.p7m` as signed to match the interceptor filter.
 */
export function isSignedXmlP7m(filename: string): boolean {
  return /\.xml\.p7m$/i.test(filename);
}
