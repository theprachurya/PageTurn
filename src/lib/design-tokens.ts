/**
 * PageTurn Design Tokens
 * Harmonizes Apple's precision hierarchy, Nothing.tech's monochromatic technical identity,
 * Google's accessible clarity, and physical book tactility.
 */

export const DESIGN_TOKENS = {
  colors: {
    ink: "#0c0e11",
    graphite: {
      950: "#101317",
      900: "#161a20",
      800: "#1e232b",
      700: "#272e38",
      600: "#343d4a",
      500: "#525e70",
      400: "#7c8ba0",
      300: "#a9b6c8",
      200: "#d3dbe5",
      100: "#edf1f6",
    },
    signal: {
      accent: "#d8ff3e",
      hover: "#e4ff69",
      subtle: "rgba(216, 255, 62, 0.12)",
      glow: "rgba(216, 255, 62, 0.25)",
      border: "rgba(216, 255, 62, 0.35)",
    },
    paper: {
      surface: "#f5f2eb",
      warm: "#ede8db",
      sepia: "#f2ebd9",
      inkText: "#25282a",
      mutedText: "#62676d",
    },
    obsidian: {
      surface: "#101214",
      card: "#171a1e",
      border: "#282d34",
      text: "#f0f3f6",
      muted: "#8c96a4",
    },
  },
  typography: {
    display: "var(--font-space-grotesk)",
    body: "var(--font-dm-sans)",
    mono: "var(--font-dm-mono)",
    serif: "var(--font-source-serif)",
  },
  elevation: {
    surface: "0 1px 2px rgba(0, 0, 0, 0.3)",
    float: "0 8px 24px -6px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.3)",
    overlay: "0 24px 48px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)",
    book: "0 12px 36px -10px rgba(0, 0, 0, 0.65), 0 2px 8px -2px rgba(0, 0, 0, 0.4)",
  },
  timing: {
    quick: "150ms cubic-bezier(0.2, 0.8, 0.2, 1)",
    standard: "280ms cubic-bezier(0.16, 1, 0.3, 1)",
    fluid: "420ms cubic-bezier(0.16, 1, 0.3, 1)",
    pageTurn: "520ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;
