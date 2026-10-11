import { describe, expect, it } from 'vitest';
import {
  decodeText,
  formatFromName,
  parseCsv,
  parseItems,
  parseMd,
  parseTxt,
} from '../src/parsers';

const labels = (entries: { label: string }[]) => entries.map((e) => e.label);

describe('formatFromName', () => {
  it('拡張子で判定し、大文字も扱う', () => {
    expect(formatFromName('a.csv')).toBe('csv');
    expect(formatFromName('A.CSV')).toBe('csv');
    expect(formatFromName('list.md')).toBe('md');
    expect(formatFromName('list.markdown')).toBe('md');
    expect(formatFromName('list.txt')).toBe('txt');
  });

  it('不明・拡張子なしは txt', () => {
    expect(formatFromName('list.log')).toBe('txt');
    expect(formatFromName('list')).toBe('txt');
  });
});

describe('parseTxt', () => {
  it('前後の空白を除去し、空行を無視する', () => {
    expect(labels(parseTxt('  りんご \n\n\tみかん\n   \nぶどう'))).toEqual([
      'りんご',
      'みかん',
      'ぶどう',
    ]);
  });

  it('CRLF / CR の改行も扱う', () => {
    expect(labels(parseTxt('a\r\nb\rc'))).toEqual(['a', 'b', 'c']);
  });

  it('重みはすべて 1', () => {
    expect(parseTxt('a\nb').every((e) => e.weight === 1)).toBe(true);
  });

  it('空文字なら0件', () => {
    expect(parseTxt('')).toEqual([]);
    expect(parseTxt('\n \n')).toEqual([]);
  });

  it('先頭の BOM を除去する', () => {
    expect(labels(parseTxt('﻿a\nb'))).toEqual(['a', 'b']);
  });
});

describe('parseMd', () => {
  it('箇条書きの行だけを項目にする', () => {
    const md = [
      '# 見出し',
      '',
      '本文の段落。',
      '- りんご',
      '* みかん',
      '1. ぶどう',
      '10. もも',
      '## 小見出し',
      '  - 入れ子',
    ].join('\n');
    expect(labels(parseMd(md))).toEqual(['りんご', 'みかん', 'ぶどう', 'もも', '入れ子']);
  });

  it('記号の後に空白がない行は無視する', () => {
    expect(parseMd('-なし\n*強調*\n**太字**\n***\n1.5倍')).toEqual([]);
  });

  it('中身が空の箇条書きは無視する', () => {
    expect(labels(parseMd('- \n-   \n- a'))).toEqual(['a']);
  });
});

describe('parseCsv', () => {
  it('1列目を項目名、2列目の正の数を重みにする', () => {
    expect(parseCsv('a,3\nb,0.5\nc')).toEqual([
      { label: 'a', weight: 3 },
      { label: 'b', weight: 0.5 },
      { label: 'c', weight: 1 },
    ]);
  });

  it('正の数でない2列目は重み 1', () => {
    const csv = 'a,0\nb,-2\nc,abc\nd,\ne,Infinity\nf,NaN';
    expect(parseCsv(csv).map((e) => e.weight)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('引用符付きのカンマ・前後空白を扱う', () => {
    expect(parseCsv('"東京, 日本", 2 \n  大阪  ,1')).toEqual([
      { label: '東京, 日本', weight: 2 },
      { label: '大阪', weight: 1 },
    ]);
  });

  it('空行と1列目が空の行は無視する', () => {
    expect(labels(parseCsv('a\n\n,5\n  \nb\r\n'))).toEqual(['a', 'b']);
  });

  it('1列だけのCSV', () => {
    expect(labels(parseCsv('x\ny\nz'))).toEqual(['x', 'y', 'z']);
  });
});

describe('decodeText', () => {
  it('UTF-8 として読む（BOM は除去）', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('あい')]);
    expect(decodeText(bytes)).toBe('あい');
  });

  it('UTF-8 として不正なら Shift_JIS で読む', () => {
    // 「テスト」の Shift_JIS
    const sjis = new Uint8Array([0x83, 0x65, 0x83, 0x58, 0x83, 0x67]);
    expect(decodeText(sjis)).toBe('テスト');
  });

  it('ArrayBuffer も受け付ける', () => {
    expect(decodeText(new TextEncoder().encode('abc').buffer)).toBe('abc');
  });
});

describe('parseItems', () => {
  it('enabled: true と一意な id を付ける', () => {
    const items = parseItems('a\nb\na', 'txt');
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.enabled)).toBe(true);
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
  });

  it('0件でもエラーにならない', () => {
    expect(parseItems('', 'csv')).toEqual([]);
    expect(parseItems('# 見出しだけ', 'md')).toEqual([]);
  });
});
