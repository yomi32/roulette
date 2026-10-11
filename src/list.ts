import type { Item, ListState } from './store';

export type ListAction = 'toggle' | 'remove';

/** 検索用に正規化。全角英数と半角、大文字と小文字を同一視する */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function filterItems(items: Item[], query: string): Item[] {
  const q = normalize(query.trim());
  if (q === '') return items;
  return items.filter((item) => normalize(item.label).includes(q));
}

// 項目名は外部入力。textContent 以外では描かない。
export function renderList(container: HTMLElement, state: ListState, query: string): void {
  const visible = filterItems(state.items, query);
  const enabled = state.items.filter((item) => item.enabled);
  const excluded = state.items.filter((item) => !item.enabled);
  const filtering = query.trim() !== '';

  container.replaceChildren(
    renderGroup({
      title: '有効',
      total: enabled.length,
      items: visible.filter((item) => item.enabled),
      filtering,
      emptyText: '有効な項目はありません',
    }),
    renderGroup({
      title: '除外中',
      total: excluded.length,
      items: visible.filter((item) => !item.enabled),
      filtering,
      emptyText: '除外中の項目はありません',
    }),
  );
}

interface GroupOptions {
  title: string;
  total: number;
  items: Item[];
  filtering: boolean;
  emptyText: string;
}

function renderGroup({ title, total, items, filtering, emptyText }: GroupOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'list-group';

  const heading = document.createElement('h2');
  heading.textContent = filtering
    ? `${title}（${items.length} / ${total}件）`
    : `${title}（${total}件）`;
  section.append(heading);

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'list-empty';
    empty.textContent = filtering && total > 0 ? '一致する項目はありません' : emptyText;
    section.append(empty);
    return section;
  }

  const ul = document.createElement('ul');
  ul.className = 'item-list';
  for (const item of items) ul.append(renderItem(item));
  section.append(ul);
  return section;
}

function renderItem(item: Item): HTMLElement {
  const li = document.createElement('li');
  li.className = item.enabled ? 'item' : 'item excluded';

  const label = document.createElement('span');
  label.className = 'item-label';
  label.textContent = item.label;
  li.append(label);

  if (item.weight !== 1) {
    const weight = document.createElement('span');
    weight.className = 'item-weight';
    weight.textContent = `×${item.weight}`;
    li.append(weight);
  }

  li.append(actionButton(item, 'toggle', item.enabled ? '除外' : '復帰'));
  // 完全削除は除外中の項目にだけ出す。除外と取り違えないように。
  if (!item.enabled) li.append(actionButton(item, 'remove', '完全削除'));
  return li;
}

function actionButton(item: Item, action: ListAction, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `item-action action-${action}`;
  button.dataset.action = action;
  button.dataset.id = item.id;
  button.textContent = text;
  // 同じ文言のボタンが並ぶので、読み上げでは項目名を付ける。
  button.setAttribute('aria-label', `${item.label}を${text}`);
  return button;
}
