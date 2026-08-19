export interface ReaderSettings {
  theme: "light" | "dark" | "sepia";
  fontSize: number;
  fontFamily: "serif" | "sans-serif" | "dyslexic";
  disablePublisherCSS: boolean;
  viewMode: "scrolled" | "paginated";
}

const STORAGE_KEY = "pageturn-reader-settings";

const defaults: ReaderSettings = {
  theme: "light",
  fontSize: 100,
  fontFamily: "serif",
  disablePublisherCSS: false,
  viewMode: "scrolled",
};

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): void {
  if (typeof window === "undefined") return;
  const current = getReaderSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
