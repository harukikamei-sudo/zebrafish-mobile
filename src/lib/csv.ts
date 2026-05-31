import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** 1セルを CSV 用にエスケープ */
function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** 行(オブジェクト配列)を CSV 文字列に変換。columns は出力順、headers は表示見出し。 */
export function toCsv<T extends Record<string, any>>(
  rows: T[],
  columns: string[],
  headers?: string[],
): string {
  const head = (headers ?? columns).map(esc).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(',')).join('\n');
  return `﻿${head}\n${body}`;
}

/** CSV を一時ファイルに書き出して共有シートを開く */
export async function shareCsv(filenamePrefix: string, csv: string): Promise<void> {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 15)
    .replace(/(\d{8})(\d+)/, '$1_$2');
  const name = `${filenamePrefix}_${stamp}.csv`;
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: name, UTI: 'public.comma-separated-values-text' });
  }
}

/** ファイル URI から文字列を読む */
export async function readTextFile(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

/** 簡易 CSV パーサ。ヘッダ行をキーにしたオブジェクト配列を返す(引用符・改行対応)。 */
export function parseCsv(text: string): Record<string, string>[] {
  // BOM 除去
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}
