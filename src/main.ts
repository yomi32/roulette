import { renderList } from './list';
import { decodeText, formatFromName, parseItems, type Format } from './parsers';
import { createStore, type ListState } from './store';

const store = createStore();

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

const dropZone = $<HTMLDivElement>('drop-zone');
const fileInput = $<HTMLInputElement>('file-input');
const pasteText = $<HTMLTextAreaElement>('paste-text');
const pasteFormat = $<HTMLSelectElement>('paste-format');
const pasteLoad = $<HTMLButtonElement>('paste-load');
const loadStatus = $<HTMLParagraphElement>('load-status');
const listContainer = $<HTMLDivElement>('list');
const searchInput = $<HTMLInputElement>('search');
const restoreAllButton = $<HTMLButtonElement>('restore-all');
const undoButton = $<HTMLButtonElement>('undo');
const undoLabel = $<HTMLParagraphElement>('undo-label');

function showStatus(message: string, isError = false): void {
  loadStatus.textContent = message;
  loadStatus.classList.toggle('error', isError);
}

function loadText(text: string, format: Format, source: string): void {
  const items = parseItems(text, format);
  if (items.length === 0) {
    // 空振りで今のリストを消さない。
    showStatus(`「${source}」から項目が見つかりませんでした`, true);
    return;
  }
  store.loadItems(source, items);
  showStatus(`「${source}」から ${items.length} 件読み込みました`);
}

async function loadFile(file: File): Promise<void> {
  try {
    const text = decodeText(await file.arrayBuffer());
    loadText(text, formatFromName(file.name), file.name);
  } catch (e) {
    console.error(e);
    showStatus(`「${file.name}」を読み込めませんでした`, true);
  }
}

// --- ファイル選択 ---
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void loadFile(file);
  // 同じファイルを続けて選んでも change が発火するように。
  fileInput.value = '';
});

// --- ドラッグ&ドロップ ---
// 窓全体で受ける。ドロップ先を外すとブラウザがファイルを開いてページが消える、から。
let dragDepth = 0;

function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes('Files') ?? false;
}

window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  dropZone.classList.add('dragover');
});

window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropZone.classList.remove('dragover');
});

window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  if (files.length > 1) {
    showStatus('ファイルは1つずつドロップしてください', true);
    return;
  }
  void loadFile(files[0]);
});

// --- テキスト貼り付け ---
pasteLoad.addEventListener('click', () => {
  loadText(pasteText.value, pasteFormat.value as Format, '貼り付け');
});

// --- 一覧 ---
function render(state: ListState): void {
  renderList(listContainer, state, searchInput.value);
  restoreAllButton.disabled = !state.items.some((item) => !item.enabled);
  undoButton.disabled = state.undoLabel === null;
  undoLabel.textContent = state.undoLabel ? `直前の操作：${state.undoLabel}` : '';
}

// ボタンは描き直しで作り直されるので、親で1回だけ受ける。
listContainer.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const button = e.target.closest<HTMLButtonElement>('button[data-action]');
  const id = button?.dataset.id;
  if (!button || !id) return;
  if (button.dataset.action === 'toggle') store.toggleEnabled(id);
  else if (button.dataset.action === 'remove') store.removeItem(id);
});

searchInput.addEventListener('input', () => render(store.getState()));
restoreAllButton.addEventListener('click', () => store.restoreAll());
undoButton.addEventListener('click', () => store.undo());

store.subscribe(render);
render(store.getState());
