import { isSignedXmlP7m } from "./filename";

export type DownloadMode = "xml" | "p7m" | null;

export type DownloadState = {
  mode: DownloadMode;
  label: string | null;
};

export function normalizeSignedFilename(name: string): string {
  if (!isSignedXmlP7m(name)) return name;
  return name.replace(/\.p7m$/i, "");
}

export function getDownloadState(input: {
  xmlContent: string | null;
  originalFilename: string | null;
  originalB64: string | null;
  hadError: boolean;
}): DownloadState {
  if (!input.hadError && input.xmlContent) {
    return { mode: "xml", label: "Download anyway" };
  }
  if (
    input.hadError &&
    input.originalFilename &&
    input.originalB64 &&
    isSignedXmlP7m(input.originalFilename)
  ) {
    return { mode: "p7m", label: "Download original .p7m" };
  }
  return { mode: null, label: null };
}
