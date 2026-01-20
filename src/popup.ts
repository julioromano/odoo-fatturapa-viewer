import { DEFAULT_ALLOWLIST, hostToMatches, normalizeHost, uniqueHosts } from "./allowlist";

function setStatus(message: string, isError = false): void {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#2f6f3e";
}

function renderList(hosts: string[]): void {
  const listEl = document.getElementById("list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const defaults = new Set(DEFAULT_ALLOWLIST);

  hosts.forEach((host) => {
    const li = document.createElement("li");
    const label = document.createElement("code");
    label.textContent = host;
    const btn = document.createElement("button");
    btn.textContent = defaults.has(host) ? "Default" : "Remove";
    btn.disabled = defaults.has(host);
    btn.addEventListener("click", () => removeHost(host));
    li.appendChild(label);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

async function loadHosts(): Promise<string[]> {
  const stored = await new Promise<string[]>((resolve) => {
    chrome.storage.sync.get({ allowed_hosts: DEFAULT_ALLOWLIST }, (data) => {
      const list = Array.isArray(data.allowed_hosts) ? data.allowed_hosts : DEFAULT_ALLOWLIST;
      const cleaned = list
        .filter((item): item is string => typeof item === "string")
        .map(normalizeHost)
        .filter((item): item is string => Boolean(item));
      resolve(uniqueHosts(cleaned.length ? cleaned : DEFAULT_ALLOWLIST));
    });
  });

  const defaults = new Set(DEFAULT_ALLOWLIST);
  const optionalHosts = stored.filter((host) => !defaults.has(host));
  const grantedOptional: string[] = [];

  for (const host of optionalHosts) {
    const origins = hostToMatches(host);
    const hasPermission = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ origins }, (result) => resolve(Boolean(result)));
    });
    if (hasPermission) grantedOptional.push(host);
  }

  const filtered = uniqueHosts([
    ...stored.filter((host) => defaults.has(host)),
    ...grantedOptional,
  ]);

  if (filtered.length !== stored.length || filtered.some((host, idx) => host !== stored[idx])) {
    await saveHosts(filtered);
  }

  return filtered;
}

async function saveHosts(hosts: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ allowed_hosts: hosts }, () => resolve());
  });
}

async function addHost(rawValue: string): Promise<void> {
  const host = normalizeHost(rawValue);
  if (!host) {
    setStatus("Invalid hostname.", true);
    return;
  }

  const hosts = await loadHosts();
  if (hosts.includes(host)) {
    setStatus("Already in the list.");
    return;
  }

  const origins = hostToMatches(host);
  const next = uniqueHosts([...hosts, host]);
  await saveHosts(next);
  renderList(next);
  chrome.permissions.request({ origins }, async (granted) => {
    if (!granted) {
      await saveHosts(hosts);
      renderList(hosts);
      setStatus("Permission not granted.", true);
      return;
    }
    setStatus("Added.");
  });
}

async function getActiveTabHost(): Promise<string | null> {
  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (result) => resolve(result));
  });

  const url = tabs[0]?.url;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return normalizeHost(parsed.hostname);
  } catch {
    return null;
  }
}

async function removeHost(host: string): Promise<void> {
  const defaults = new Set(DEFAULT_ALLOWLIST);
  if (defaults.has(host)) return;

  const hosts = await loadHosts();
  const next = hosts.filter((item) => item !== host);
  const origins = hostToMatches(host);
  chrome.permissions.remove({ origins }, async () => {
    await saveHosts(next);
    renderList(next);
    setStatus("Removed.");
  });
}

function init(): void {
  const addBtn = document.getElementById("addBtn");

  addBtn?.addEventListener("click", () => {
    setStatus("");
    getActiveTabHost().then((host) => {
      if (!host) {
        setStatus("Unable to read the current site.", true);
        return;
      }
      addHost(host);
    });
  });

  loadHosts().then((hosts) => renderList(hosts));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
