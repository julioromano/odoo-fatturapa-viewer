// viewer.ts

async function main(): Promise<void> {
  const statusEl = document.getElementById("status") as HTMLElement;
  const outEl = document.getElementById("out") as HTMLElement;
  const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement | null;

  let xmlContent: string | null = null;
  let filename = "download.xml";

  // Helper to trigger download
  function triggerDownload(): void {
    if (!xmlContent) return;
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  if (downloadBtn) {
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
    const bin = atob(data.xml_blob_b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    xmlContent = new TextDecoder().decode(bytes);
    filename = data.xml_filename || "download.xml";

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
  }
}

main();
