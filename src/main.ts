import { normalizePath, Plugin, type TFolder } from 'obsidian';
import { EXTENSION, NotebookView, VIEW_TYPE } from './view';

// An empty notebook: one lined page.
const EMPTY = JSON.stringify({ v: 1, paper: 'lined', pages: [{ paper: 'lined', strokes: [] }] });

export default class SpaceNotebookPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new NotebookView(leaf));
    this.registerExtensions([EXTENSION], VIEW_TYPE);
    this.addCommand({
      id: 'new-notebook',
      name: 'New notebook',
      callback: () => this.newNotebook(),
    });
  }

  // in the folder of the file you are in (else the vault's top folder), opened in this tab
  async newNotebook() {
    const folder: TFolder = this.app.workspace.getActiveFile()?.parent ?? this.app.vault.getRoot();
    const base = folder.isRoot() ? '' : folder.path + '/';
    let path = normalizePath(base + 'Untitled notebook.' + EXTENSION);
    for (let i = 1; this.app.vault.getAbstractFileByPath(path); i++) {
      path = normalizePath(base + 'Untitled notebook ' + i + '.' + EXTENSION);
    }
    const file = await this.app.vault.create(path, EMPTY);
    await this.app.workspace.getLeaf(false).openFile(file);
    return file;
  }
}
