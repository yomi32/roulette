import type { Item, ListState } from './store';

// 項目名は外部入力。textContent 以外では描かない。
export function renderList(container: HTMLElement, state: ListState): void {
  const enabled = state.items.filter((item) => item.enabled);
  const excluded = state.items.filter((item) => !item.enabled);

  container.replaceChildren(
    renderGroup('有効', enabled, '有効な項目はありません'),
    renderGroup('除外中', excluded, '除外中の項目はありません'),
  );
}

function renderGroup(title: string, items: Item[], emptyText: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'list-group';

  const heading = document.createElement('h2');
  heading.textContent = `${title}（${items.length}件）`;
  section.append(heading);

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'list-empty';
    empty.textContent = emptyText;
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
  li.className = 'item';
  li.dataset.id = item.id;

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
  return li;
}
