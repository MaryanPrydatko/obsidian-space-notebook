// The notebook (src/notebook/*.js, joined into one function by esbuild.config.mjs).
declare module 'notebook-core' {
  export interface NotebookIO {
    /** Per-device settings (pens, colours, view), kept in Obsidian's local storage for this vault. */
    pref: { get(k: string): string | null; set(k: string, v: string): void; json<T>(k: string, d: T): T; setJSON(k: string, v: unknown): void };
    /** The notebook changed: save it a moment later. */
    changed(): void;
    /** The pointer went down on the page: make this view the active one. */
    activate(): void;
    /** The file's name without its extension, and its path (per-notebook settings are keyed by it). */
    title(): string;
    id(): string;
    rename(name: string): void;
    /** Keeps a PDF next to the notebook; resolves to its vault path. */
    savePdf(name: string, blob: Blob): Promise<string>;
  }
  export interface Notebook {
    load(text: string, clear: boolean): void;
    serialize(): string;
    destroy(): void;
    refresh(): void;
    saved(): void;
    renamed(): void;
    pdf(all: boolean): Promise<{ blob: Blob; pages: number; page: number }>;
    draw(): void;
  }
  export function createNotebook(host: HTMLElement, io: NotebookIO): Notebook;
}
