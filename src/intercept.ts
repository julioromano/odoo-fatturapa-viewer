// intercept.ts — minimal capture for blob: XML downloads

(function () {
  const aClick = HTMLAnchorElement.prototype.click;
  const B64 = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  function inferName(downloadName?: string | null): string {
    return downloadName || "download.xml";
  }

  async function handleBlob(url: string, downloadName?: string | null): Promise<boolean> {
    let blob: Blob;
    try {
      const resp = await fetch(url);
      blob = await resp.blob();
    } catch (e) {
      console.warn("[xml-preview][cs] fetch blob failed", e);
      return false;
    }

    const name = inferName(downloadName);
    const isXml = /xml/i.test(blob.type) || /\.xml$/i.test(name);
    if (!isXml) return false;

    const buf = await blob.arrayBuffer();
    const b64 = B64(buf);
    chrome.runtime.sendMessage({
      kind: "XML_BYTES_B64",
      b64,
      filename: name,
    });
    return true;
  }

  // Intercept user and programmatic anchor clicks on blob: URLs.
  addEventListener(
    "click",
    (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("blob:")) return;
      if (a.dataset.xmlPreviewBypass === "1") {
        delete a.dataset.xmlPreviewBypass;
        return;
      }

      // Prevent download immediately; re-trigger only if it's not XML.
      ev.preventDefault();
      ev.stopImmediatePropagation();

      handleBlob(href, a.getAttribute("download")).then((handled) => {
        if (!handled) {
          a.dataset.xmlPreviewBypass = "1";
          aClick.call(a);
          setTimeout(() => {
            delete a.dataset.xmlPreviewBypass;
          }, 0);
        }
      });
    },
    true
  );
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement): void {
    const href = this.getAttribute("href") || "";
    if (href.startsWith("blob:")) {
      handleBlob(href, this.getAttribute("download")).then((handled) => {
        if (!handled) aClick.call(this);
      });
      return;
    }
    return aClick.call(this);
  };

  console.log("[xml-preview][cs] intercept loaded");
})();
