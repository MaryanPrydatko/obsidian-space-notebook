import { Notice, normalizePath, TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';
import { createNotebook, type Notebook, type NotebookIO } from 'notebook-core';

export const VIEW_TYPE = 'space-notebook';
export const EXTENSION = 'notebook';

const PREF = 'space-notebook:';

// One .notebook file in a tab. The notebook draws itself into contentEl; this view only moves its JSON in and out.
export class NotebookView extends TextFileView {
  private nb: Notebook | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return this.file?.basename ?? 'Notebook';
  }

  getIcon() {
    return 'pen-tool';
  }

  async onOpen() {
    this.contentEl.addClass('space-notebook-view');
    this.notebook();
    this.registerEvent(this.app.workspace.on('css-change', () => this.nb?.refresh()));
  }

  async onClose() {
    this.nb?.destroy();
    this.nb = null;
  }

  // made the first time it is needed (Obsidian may hand in the file before or after onOpen)
  private notebook(): Notebook {
    if (this.nb) {
      return this.nb;
    }
    const app = this.app;
    const io: NotebookIO = {
      pref: {
        get: (k) => app.loadLocalStorage(PREF + k) ?? null,
        set: (k, v) => app.saveLocalStorage(PREF + k, v),
        json: (k, d) => {
          const v = app.loadLocalStorage(PREF + k);
          try {
            return v ? JSON.parse(v) : d;
          } catch {
            return d;
          }
        },
        setJSON: (k, v) => app.saveLocalStorage(PREF + k, JSON.stringify(v)),
      },
      changed: () => this.requestSave(),
      activate: () => {
        if (app.workspace.getActiveViewOfType(NotebookView) !== this) {
          app.workspace.setActiveLeaf(this.leaf, { focus: false });
        }
      },
      title: () => this.file?.basename ?? 'Notebook',
      id: () => this.file?.path ?? '',
      rename: (name) => {
        const file = this.file;
        if (!file) {
          return;
        }
        const clean = name.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').trim();
        if (!clean) {
          return;
        }
        const to = normalizePath((file.parent && !file.parent.isRoot() ? file.parent.path + '/' : '') + clean + '.' + EXTENSION);
        app.fileManager.renameFile(file, to).catch((e: Error) => {
          new Notice('Could not rename: ' + e.message);
          this.nb?.renamed();
        });
      },
      savePdf: async (name, blob) => {
        const folder = this.file?.parent && !this.file.parent.isRoot() ? this.file.parent.path + '/' : '';
        const clean = name.replace(/[\\/:*?"<>|#^[\]]+/g, ' ').trim() || 'Notebook';
        let path = normalizePath(folder + clean + '.pdf');
        for (let i = 1; app.vault.getAbstractFileByPath(path); i++) {
          path = normalizePath(folder + clean + ' ' + i + '.pdf');
        }
        await app.vault.createBinary(path, await blob.arrayBuffer());
        new Notice('Saved ' + path);
        return path;
      },
    };
    this.nb = createNotebook(this.contentEl, io);
    return this.nb;
  }

  getViewData() {
    return this.nb ? this.nb.serialize() : this.data;
  }

  setViewData(data: string, clear: boolean) {
    this.notebook().load(data, clear);
  }

  clear() {
    // the next setViewData(data, true) starts the notebook afresh
  }

  async save(clear?: boolean) {
    await super.save(clear);
    this.nb?.saved();
  }

  async onRename(file: TFile) {
    await super.onRename(file);
    this.nb?.renamed();
  }
}
