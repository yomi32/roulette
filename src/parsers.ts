import Papa from 'papaparse';
import { newId } from './random';
import type { Item } from './store';

export type Format = 'txt' | 'md' | 'csv';

export interface Entry {
  label: string;
  weight: number;
}

/** 拡張子から形式を決める。不明な拡張子は txt 扱い */
export function formatFromName(name: string): Format {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv') return 'csv';
  if (ext === 'md' || ext === 'markdown') return 'md';
  return 'txt';
}

/** UTF-8 で読めなければ Shift_JIS で読み直す。BOM は TextDecoder が除去する */
export function decodeText(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('shift_jis').decode(bytes);
  }
}

function splitLines(text: string): string[] {
  return stripBom(text).split(/\r\n|\r|\n/);
}

// 貼り付けテキストには TextDecoder を通らない BOM が残ることがある。
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseTxt(text: string): Entry[] {
  return splitLines(text)
    .map((line) => line.trim())
    .filter((label) => label !== '')
    .map((label) => ({ label, weight: 1 }));
}

// "- " "* " "1. " で始まる行だけ。区切りの空白は必須なので "**太字**" や "***" は拾わない。
const MD_BULLET = /^\s*(?:[-*]|\d+\.)\s+(.*)$/;

export function parseMd(text: string): Entry[] {
  const entries: Entry[] = [];
  for (const line of splitLines(text)) {
    const m = MD_BULLET.exec(line);
    if (!m) continue;
    const label = m[1].trim();
    if (label !== '') entries.push({ label, weight: 1 });
  }
  return entries;
}

export function parseCsv(text: string): Entry[] {
  // 区切りの自動判定は1列だけのCSVで誤判定しうる。カンマに固定。
  const result = Papa.parse<string[]>(stripBom(text), {
    delimiter: ',',
    skipEmptyLines: 'greedy',
  });
  const entries: Entry[] = [];
  for (const row of result.data) {
    const label = (row[0] ?? '').trim();
    if (label === '') continue;
    entries.push({ label, weight: toWeight(row[1]) });
  }
  return entries;
}

/** 正の有限数なら重み、それ以外は 1 */
function toWeight(raw: string | undefined): number {
  const s = (raw ?? '').trim();
  if (s === '') return 1;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseEntries(text: string, format: Format): Entry[] {
  switch (format) {
    case 'txt':
      return parseTxt(text);
    case 'md':
      return parseMd(text);
    case 'csv':
      return parseCsv(text);
  }
}

export function toItems(entries: Entry[]): Item[] {
  return entries.map(({ label, weight }) => ({
    id: newId(),
    label,
    enabled: true,
    weight,
  }));
}

export function parseItems(text: string, format: Format): Item[] {
  return toItems(parseEntries(text, format));
}
