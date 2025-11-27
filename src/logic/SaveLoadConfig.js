const KEY = "hypnosonore-config";

export function saveConfig(config) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(config));
}

export function loadConfig() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
