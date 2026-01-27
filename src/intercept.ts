// intercept.ts — minimal capture for blob: XML downloads

import { isAllowedExtension, shouldHandleInvoice } from "./intercept-filter";

(function () {
  const aClick = HTMLAnchorElement.prototype.click;
  const B64 = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  function inferName(downloadName?: string | null): string | null {
    if (!downloadName) return null;
    return downloadName;
  }

  function shouldAttemptIntercept(downloadName?: string | null): boolean {
    const name = inferName(downloadName);
    if (!name) return false;
    return isAllowedExtension(name);
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
    if (!name) return false;

    const buf = await blob.arrayBuffer();
    if (!shouldHandleInvoice(blob.type, name, buf)) return false;

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
      if (!shouldAttemptIntercept(a.getAttribute("download"))) return;
      if (a.dataset.xmlPreviewBypass === "1") {
        delete a.dataset.xmlPreviewBypass;
        return;
      }

      // Prevent download immediately; re-trigger only if it's not FatturaPA.
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
    true,
  );
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement): void {
    const href = this.getAttribute("href") || "";
    if (href.startsWith("blob:")) {
      if (!shouldAttemptIntercept(this.getAttribute("download"))) {
        return aClick.call(this);
      }
      handleBlob(href, this.getAttribute("download")).then((handled) => {
        if (!handled) aClick.call(this);
      });
      return;
    }
    return aClick.call(this);
  };

  console.log("[xml-preview][cs] intercept loaded");
})();
