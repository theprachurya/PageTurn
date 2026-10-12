export type ToastType = "success" | "error" | "info" | "signal";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

export const toast = {
  show(message: string, options?: { title?: string; type?: ToastType; duration?: number }) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = {
      id,
      message,
      title: options?.title,
      type: options?.type || "info",
      duration: options?.duration || 3200,
    };
    toasts = [...toasts, item];
    notify();

    setTimeout(() => {
      toast.dismiss(id);
    }, item.duration);

    return id;
  },
  success(message: string, title?: string) {
    return toast.show(message, { title, type: "success" });
  },
  error(message: string, title?: string) {
    return toast.show(message, { title, type: "error" });
  },
  signal(message: string, title?: string) {
    return toast.show(message, { title, type: "signal" });
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
  subscribe(listener: ToastListener) {
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  },
};
