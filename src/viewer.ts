// viewer.ts

import { getDownloadState, type DownloadMode } from "./viewer-logic";
import { decodeBase64ToBytes, resolveXmlPayload } from "./viewer-data";

async function main(): Promise<void> {
  const statusEl = document.getElementById("status") as HTMLElement;
  const outEl = document.getElementById("out") as HTMLElement;
  const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement | null;
  const defaultDownloadLabel = downloadBtn?.textContent || "Download";

  let xmlContent: string | null = null;
  let filename = "download.xml";
  let downloadMode: "xml" | "p7m" | null = null;
  let originalB64: string | null = null;
  let originalFilename: string | null = null;

  // Helper to trigger download
  function applyDownloadState(state: { mode: DownloadMode; label: string | null }): void {
    downloadMode = state.mode;
    if (downloadBtn) {
      downloadBtn.disabled = !downloadMode;
      downloadBtn.textContent = state.label ?? defaultDownloadLabel;
    }
  }

  function triggerDownload(): void {
    if (!downloadMode) return;
    let blob: Blob;
    let downloadName = filename;
    if (downloadMode === "xml") {
      if (!xmlContent) return;
      blob = new Blob([xmlContent], { type: "application/xml" });
    } else {
      if (!originalB64 || !originalFilename) return;
      const bytes = decodeBase64ToBytes(originalB64);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      blob = new Blob([buffer], { type: "application/pkcs7-mime" });
      downloadName = originalFilename;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.addEventListener("click", triggerDownload);
  }

  try {
    if (location.hash !== "#blob") {
      statusEl.textContent = "No XML source provided.";
      return;
    }

    // Blob mode
    const data = await chrome.storage.session.get(["xml_blob_b64", "xml_filename"]) as {
      xml_blob_b64?: string;
      xml_filename?: string;
    };
    if (!data.xml_blob_b64) {
      throw new Error("No XML data found in session storage.");
    }
    filename = data.xml_filename || "download.xml";
    originalFilename = filename;
    originalB64 = data.xml_blob_b64;
    const resolved = resolveXmlPayload({
      b64: data.xml_blob_b64,
      filename,
    });
    xmlContent = resolved.xmlContent;
    filename = resolved.filename;
    applyDownloadState(
      getDownloadState({
        xmlContent,
        originalFilename,
        originalB64,
        hadError: false,
      })
    );

    // Render
    statusEl.textContent = "Rendering...";
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

    const parseErr = xmlDoc.querySelector("parsererror");
    if (parseErr) {
      throw new Error("XML Parse Error: " + parseErr.textContent);
    }

    // Load XSLT
    // We try style.xsl first as seen in the previous code
    const xsltResp = await fetch(chrome.runtime.getURL("style.xsl"));
    if (!xsltResp.ok) throw new Error("Failed to load style.xsl");
    const xsltText = await xsltResp.text();
    const xsltDoc = parser.parseFromString(xsltText, "application/xml");

    const processor = new XSLTProcessor();
    processor.importStylesheet(xsltDoc);
    const fragment = processor.transformToFragment(xmlDoc, document);

    outEl.innerHTML = "";
    outEl.appendChild(fragment);
    statusEl.textContent = ""; // Clear status on success
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : String(e);
    statusEl.textContent = `Error: ${message}`;
    statusEl.style.color = "red";
    applyDownloadState(
      getDownloadState({
        xmlContent,
        originalFilename,
        originalB64,
        hadError: true,
      })
    );
  }
}

main();
