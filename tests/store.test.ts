import { describe, expect, it, vi } from 'vitest';
import { filterItems } from '../src/list';
import { createStore, type Item } from '../src/store';

function item(id: string, label: string, enabled = true, weight = 1): Item {
  return { id, label, enabled, weight };
}

function setup(items: Item[] = [item('a', 'りんご'), item('b', 'みかん'), item('c', 'ぶどう')]) {
  const store = createStore();
  store.loadItems('test.txt', items);
  return store;
}

const enabledIds = (items: Item[]) => items.filter((i) => i.enabled).map((i) => i.id);

describe('toggleEnabled', () => {
  it('除外と復帰を切り替える', () => {
    const store = setup();
    store.toggleEnabled('b');
    expect(enabledIds(store.getState().items)).toEqual(['a', 'c']);
    store.toggleEnabled('b');
    expect(enabledIds(store.getState().items)).toEqual(['a', 'b', 'c']);
  });

  it('元の配列と項目を書き換えない', () => {
    const items = [item('a', 'りんご')];
    const store = setup(items);
    store.toggleEnabled('a');
    expect(items[0].enabled).toBe(true);
  });

  it('存在しない id は何もしない（Undo も記録しない）', () => {
    const store = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    store.toggleEnabled('zzz');
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().undoLabel).toBeNull();
  });
});

describe('restoreAll', () => {
  it('全項目を有効に戻す', () => {
    const store = setup([item('a', 'x', false), item('b', 'y'), item('c', 'z', false)]);
    store.restoreAll();
    expect(enabledIds(store.getState().items)).toEqual(['a', 'b', 'c']);
    expect(store.getState().undoLabel).toBe('2件を全復帰');
  });

  it('除外中が0件なら何もしない', () => {
    const store = setup();
    store.restoreAll();
    expect(store.getState().undoLabel).toBeNull();
  });
});

describe('removeItem', () => {
  it('項目を一覧から取り除く', () => {
    const store = setup();
    store.removeItem('a');
    expect(store.getState().items.map((i) => i.id)).toEqual(['b', 'c']);
  });
});

describe('undo', () => {
  it('直前1操作だけ取り消す', () => {
    const store = setup();
    store.toggleEnabled('a');
    store.toggleEnabled('b');
    expect(store.getState().undoLabel).toBe('「みかん」を除外');

    store.undo();
    expect(enabledIds(store.getState().items)).toEqual(['b', 'c']);
    expect(store.getState().undoLabel).toBeNull();

    // 2回目は何も起きない。
    store.undo();
    expect(enabledIds(store.getState().items)).toEqual(['b', 'c']);
  });

  it('完全削除を取り消すと元の位置に戻る', () => {
    const store = setup();
    store.removeItem('b');
    store.undo();
    expect(store.getState().items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('読み込みで Undo は消える', () => {
    const store = setup();
    store.toggleEnabled('a');
    store.loadItems('other.txt', [item('x', 'x')]);
    expect(store.getState().undoLabel).toBeNull();
    store.undo();
    expect(store.getState().items.map((i) => i.id)).toEqual(['x']);
  });
});

describe('0件・1件', () => {
  it('0件で全操作してもエラーにならない', () => {
    const store = setup([]);
    expect(() => {
      store.toggleEnabled('a');
      store.removeItem('a');
      store.restoreAll();
      store.undo();
    }).not.toThrow();
    expect(store.getState().items).toEqual([]);
  });

  it('1件を除外して完全削除し、Undo で戻す', () => {
    const store = setup([item('a', 'ひとつ')]);
    store.toggleEnabled('a');
    store.removeItem('a');
    expect(store.getState().items).toEqual([]);
    store.undo();
    expect(store.getState().items).toEqual([item('a', 'ひとつ', false)]);
  });
});

describe('filterItems', () => {
  const items = [item('a', 'Apple'), item('b', 'ｂａｎａｎａ'), item('c', 'みかん')];

  it('空の検索語なら全件', () => {
    expect(filterItems(items, '  ')).toBe(items);
  });

  it('部分一致・大文字小文字を区別しない', () => {
    expect(filterItems(items, 'app').map((i) => i.id)).toEqual(['a']);
  });

  it('全角と半角を同一視する', () => {
    expect(filterItems(items, 'BAN').map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, 'ＡＰＰ').map((i) => i.id)).toEqual(['a']);
  });

  it('日本語', () => {
    expect(filterItems(items, 'かん').map((i) => i.id)).toEqual(['c']);
  });
});
