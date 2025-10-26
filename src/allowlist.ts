export const DEFAULT_ALLOWLIST = ["*.odoo.com"];

export function normalizeHost(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  let host: string;

  if (trimmed.includes("://")) {
    try {
      host = new URL(trimmed).hostname.toLowerCase();
    } catch {
      return null;
    }
  } else {
    host = trimmed.split("/")[0];
  }

  if (host.startsWith(".")) host = host.slice(1);
  if (host.includes("*") && !host.startsWith("*.")) return null;
  if (host === "*" || host === "") return null;
  return host;
}

export function hostToMatches(host: string): string[] {
  return [`https://${host}/*`, `http://${host}/*`];
}

export function uniqueHosts(hosts: string[]): string[] {
  return Array.from(new Set(hosts));
}

export function uniqueMatches(matches: string[]): string[] {
  return Array.from(new Set(matches));
}
