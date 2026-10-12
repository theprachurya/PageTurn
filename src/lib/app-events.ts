type AppEventListener = () => void;

const openCommandPaletteListeners = new Set<AppEventListener>();
const openUploaderListeners = new Set<AppEventListener>();

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
};

export const triggerUploadModal = () => appEvents.openUploader();
export const openCommandPalette = () => appEvents.openCommandPalette();
