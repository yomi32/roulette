export interface Item {
  id: string;
  label: string;
  enabled: boolean;
  weight: number;
}

export interface ListState {
  /** 元ファイル名（表示用）。未読み込みなら空文字 */
  source: string;
  items: Item[];
  /** 取り消せる直前の操作の説明。なければ null */
  undoLabel: string | null;
}

type Listener = (state: ListState) => void;

interface UndoEntry {
  items: Item[];
  label: string;
}

export interface Store {
  getState(): ListState;
  subscribe(listener: Listener): () => void;
  loadItems(source: string, items: Item[]): void;
  toggleEnabled(id: string): void;
  restoreAll(): void;
  removeItem(id: string): void;
  undo(): void;
}

export function createStore(): Store {
  let source = '';
  let items: Item[] = [];
  // 直前1操作ぶんだけ。items は毎回新しい配列にしているので、参照を持つだけで足りる。
  let undoEntry: UndoEntry | null = null;
  const listeners = new Set<Listener>();

  function getState(): ListState {
    return { source, items, undoLabel: undoEntry?.label ?? null };
  }

  function emit(): void {
    const state = getState();
    for (const listener of listeners) listener(state);
  }

  /** 変更があったときだけ Undo を記録して通知する */
  function commit(next: Item[], label: string): void {
    undoEntry = { items, label };
    items = next;
    emit();
  }

  return {
    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // 読み込みはリストの入れ替え。一覧操作ではないので Undo 対象にしない。
    loadItems(newSource, newItems) {
      source = newSource;
      items = newItems;
      undoEntry = null;
      emit();
    },

    toggleEnabled(id) {
      const target = items.find((item) => item.id === id);
      if (!target) return;
      const next = items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      );
      commit(next, `「${target.label}」を${target.enabled ? '除外' : '復帰'}`);
    },

    restoreAll() {
      const count = items.filter((item) => !item.enabled).length;
      if (count === 0) return;
      const next = items.map((item) => (item.enabled ? item : { ...item, enabled: true }));
      commit(next, `${count}件を全復帰`);
    },

    removeItem(id) {
      const target = items.find((item) => item.id === id);
      if (!target) return;
      commit(
        items.filter((item) => item.id !== id),
        `「${target.label}」を完全削除`,
      );
    },

    undo() {
      if (!undoEntry) return;
      items = undoEntry.items;
      undoEntry = null;
      emit();
    },
  };
}
