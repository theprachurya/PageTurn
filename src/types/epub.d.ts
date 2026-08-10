declare module "epubjs" {
  interface Book {
    renderTo(element: HTMLElement, options?: Record<string, unknown>): Rendition;
    loaded: {
      metadata: Promise<{
        title: string;
        creator: string;
        description: string;
        [key: string]: unknown;
      }>;
      cover: Promise<string>;
      navigation: Promise<{ toc: Array<{ href: string; label: string; id: string }> }>;
    };
    ready: Promise<void>;
    locations: {
      generate(chars?: number): Promise<string[]>;
      length(): number;
      percentageFromCfi(cfi: string): number;
    };
    navigation: {
      toc: Array<{ href: string; label: string; id: string }>;
    };
    archive: {
      createUrl(path: string): Promise<string>;
    };
    load: (url: string) => Promise<unknown>;
    destroy(): void;
  }

  interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    themes: {
      register(name: string, styles: Record<string, Record<string, string>>): void;
      select(name: string): void;
      fontSize(size: string): void;
      override(property: string, value: string): void;
    };
    annotations: {
      highlight(cfiRange: string, data?: unknown, cb?: (e: Event) => void, className?: string, styles?: Record<string, string>): void;
      underline(cfiRange: string, data?: unknown, cb?: (e: Event) => void, className?: string, styles?: Record<string, string>): void;
      mark(cfiRange: string, data?: unknown, cb?: (e: Event) => void): void;
      remove(cfiRange: string, type: string): void;
    };
    destroy(): void;
  }

  function ePub(input: string | ArrayBuffer): Book;
  export default ePub;
  export type { Book, Rendition };
}
