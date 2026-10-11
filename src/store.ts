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
}

type Listener = (state: ListState) => void;

let state: ListState = { source: '', items: [] };
const listeners = new Set<Listener>();

export function getState(): ListState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 読み込んだリストで現在の状態を置き換える */
export function loadItems(source: string, items: Item[]): void {
  state = { source, items };
  emit();
}

function emit(): void {
  for (const listener of listeners) listener(state);
}
