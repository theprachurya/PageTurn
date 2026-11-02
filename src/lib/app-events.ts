export interface ReaderCommandHandlers {
  onToggleTheme: (theme: "light" | "dark" | "sepia") => void;
  onToggleTTS: () => void;
  onToggleBookmark: () => void;
  onToggleSidebar: () => void;
  onToggleDistractionFree: () => void;
  toc?: Array<{ id: string; label: string; href: string }>;
  onNavigateChapter?: (href: string) => void;
}

type AppEventListener = () => void;
type ReaderHandlersListener = (handlers: ReaderCommandHandlers | null) => void;

const openCommandPaletteListeners = new Set<AppEventListener>();
const openUploaderListeners = new Set<AppEventListener>();
const readerHandlersListeners = new Set<ReaderHandlersListener>();

let currentReaderHandlers: ReaderCommandHandlers | null = null;

export const appEvents = {
  openCommandPalette() {
    openCommandPaletteListeners.forEach((fn) => fn());
  },
  onOpenCommandPalette(fn: AppEventListener) {
    openCommandPaletteListeners.add(fn);
    return () => {
      openCommandPaletteListeners.delete(fn);
    };
  },
  openUploader() {
    openUploaderListeners.forEach((fn) => fn());
  },
  onOpenUploader(fn: AppEventListener) {
    openUploaderListeners.add(fn);
    return () => {
      openUploaderListeners.delete(fn);
    };
  },
  setReaderHandlers(handlers: ReaderCommandHandlers | null) {
    currentReaderHandlers = handlers;
    readerHandlersListeners.forEach((fn) => fn(handlers));
  },
  getReaderHandlers(): ReaderCommandHandlers | null {
    return currentReaderHandlers;
  },
  onReaderHandlersChange(fn: ReaderHandlersListener) {
    readerHandlersListeners.add(fn);
    fn(currentReaderHandlers);
    return () => {
      readerHandlersListeners.delete(fn);
    };
  },
};

export const triggerUploadModal = () => appEvents.openUploader();
export const openCommandPalette = () => appEvents.openCommandPalette();
