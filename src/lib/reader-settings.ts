import { useSyncExternalStore } from "react";

export interface ReaderSettings {
  theme: "light" | "dark" | "sepia" | "oled";
  fontSize: number;
  fontFamily: "serif" | "sans-serif" | "dyslexic";
  disablePublisherCSS: boolean;
  readingMode: "paged" | "scrolled";
  lineSpacing: "compact" | "comfortable" | "relaxed";
}

const STORAGE_KEY = "pageturn-reader-settings";

const defaults: ReaderSettings = {
  theme: "light",
  fontSize: 100,
  fontFamily: "serif",
  disablePublisherCSS: false,
  readingMode: "scrolled",
  lineSpacing: "comfortable",
};

const CHANGE_EVENT = "pageturn:reader-settings";
let lastStoredValue: string | null | undefined;
let cachedSettings = defaults;
let storageUnavailable = false;

function isChoice<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return defaults;
  if (storageUnavailable) return cachedSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === lastStoredValue) return cachedSettings;
    lastStoredValue = stored;
    if (!stored) {
      cachedSettings = defaults;
      return cachedSettings;
    }
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") {
      cachedSettings = defaults;
      return cachedSettings;
    }
    const storedSettings = parsed as Partial<ReaderSettings>;
    cachedSettings = {
      theme: isChoice(storedSettings.theme, ["light", "dark", "sepia", "oled"]) ? storedSettings.theme : defaults.theme,
      fontSize: typeof storedSettings.fontSize === "number" && Number.isFinite(storedSettings.fontSize)
        ? Math.max(60, Math.min(200, storedSettings.fontSize))
        : defaults.fontSize,
      fontFamily: isChoice(storedSettings.fontFamily, ["serif", "sans-serif", "dyslexic"]) ? storedSettings.fontFamily : defaults.fontFamily,
      disablePublisherCSS: typeof storedSettings.disablePublisherCSS === "boolean" ? storedSettings.disablePublisherCSS : defaults.disablePublisherCSS,
      readingMode: isChoice(storedSettings.readingMode, ["paged", "scrolled"]) ? storedSettings.readingMode : defaults.readingMode,
      lineSpacing: isChoice(storedSettings.lineSpacing, ["compact", "comfortable", "relaxed"]) ? storedSettings.lineSpacing : defaults.lineSpacing,
    };
    return cachedSettings;
  } catch {
    lastStoredValue = null;
    cachedSettings = defaults;
    return cachedSettings;
  }
}

function subscribeToReaderSettings(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useReaderSettings(): ReaderSettings {
  return useSyncExternalStore(subscribeToReaderSettings, getReaderSettings, () => defaults);
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReaderSettings();
    const updated = { ...current, ...settings };
    const value = JSON.stringify(updated);
    cachedSettings = updated;
    try {
      localStorage.setItem(STORAGE_KEY, value);
      lastStoredValue = value;
      storageUnavailable = false;
    } catch {
      storageUnavailable = true;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Reading remains available when browser storage is full or disabled.
  }
}
