import { DEFAULT_ALLOWLIST, hostToMatches, normalizeHost, uniqueMatches } from "./allowlist";

type XmlBytesMessage = {
  kind: "XML_BYTES_B64";
  b64: string;
  filename?: string;
};

const CONTENT_SCRIPT_ID = "xml-preview-intercept";

function getAllowedHosts(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ allowed_hosts: DEFAULT_ALLOWLIST }, (data) => {
      const list = Array.isArray(data.allowed_hosts) ? data.allowed_hosts : DEFAULT_ALLOWLIST;
      const cleaned = list
        .filter((item): item is string => typeof item === "string")
        .map(normalizeHost)
        .filter((item): item is string => Boolean(item));
      resolve(cleaned);
    });
  });
}

async function registerContentScripts(): Promise<void> {
  const allowedHosts = await getAllowedHosts();
  const defaults = new Set(DEFAULT_ALLOWLIST);
  const optionalHosts = allowedHosts.filter((host) => !defaults.has(host));
  const permittedOptional: string[] = [];

  for (const host of optionalHosts) {
    const origins = hostToMatches(host);
    const hasPermission = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ origins }, (result) => resolve(Boolean(result)));
    });
    if (hasPermission) permittedOptional.push(host);
  }

  const matches = uniqueMatches(permittedOptional.flatMap(hostToMatches));

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  } catch {
    // Ignore if it wasn't registered yet.
  }

  if (matches.length === 0) return;

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["intercept.js"],
      matches,
      runAt: "document_start",
      allFrames: true,
    },
  ]);
}

void registerContentScripts();

chrome.runtime.onMessage.addListener((msg: unknown) => {
  const maybeMsg = msg as XmlBytesMessage | null;
  if (maybeMsg && maybeMsg.kind === "XML_BYTES_B64") {
    chrome.storage.session.set(
      {
        xml_blob_b64: maybeMsg.b64,
        xml_filename: maybeMsg.filename || "download.xml",
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("[xml-preview][bg] failed to store XML payload");
        }
        const dest = chrome.runtime.getURL("viewer.html#blob");
        chrome.windows.create({
          url: dest,
          type: "popup",
          width: 900,
          height: 1000,
        });
      }
    );
    // no async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
  registerContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  registerContentScripts();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes.allowed_hosts) return;
  registerContentScripts();
});

chrome.permissions.onAdded.addListener(() => {
  registerContentScripts();
});

chrome.permissions.onRemoved.addListener(() => {
  registerContentScripts();
});
