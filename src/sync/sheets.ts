/**
 * Google Sheets 双方向同期。
 * Google Apps Script の Web アプリ(doGet/doPost, JSON)をエンドポイントにして、
 * テーブルごとにレコード単位の Last-Write-Wins(updated_at 比較) でマージする。
 * 削除は deleted=1 のトンボストーンとして同期される。
 */
import { all, first, run, tx } from '../db/database';
import { SYNC_TABLES, SyncTableDef } from '../db/schema';
import { getLocal, setLocal } from '../db/settings';
import { logAction } from '../db/logs';
import { nowUtcIso } from '../lib/time';
import { bumpData } from '../state/store';

// 多重実行ガードと自動同期のデバウンス
let _busy = false;
let _lastAutoAt = 0;

export function isSyncing(): boolean {
  return _busy;
}

export function getSheetUrl(): string {
  return getLocal('sheet_url', '') ?? '';
}

export function setSheetUrl(url: string): void {
  setLocal('sheet_url', url.trim() || null);
}

export function getLastSync(): string | null {
  return getLocal('last_sync_at', null);
}

export function getSheetToken(): string {
  return getLocal('sheet_token', '') ?? '';
}

export function setSheetToken(token: string): void {
  setLocal('sheet_token', token.trim() || null);
}

/** GET 用 URL にクエリを付与(token があれば付ける) */
function buildUrl(url: string, params: Record<string, string>): string {
  const token = getSheetToken();
  const qs = new URLSearchParams({ ...params });
  if (token) qs.set('token', token);
  return `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
}

/** Sheets から来た 1 行を該当テーブルに LWW で反映 */
function upsertRaw(def: SyncTableDef, row: Record<string, any>): void {
  const cols = [def.pk, ...def.columns];
  const placeholders = cols.map(() => '?').join(',');
  const updates = def.columns.map((c) => `${c}=excluded.${c}`).join(', ');
  const values = cols.map((c) => {
    let v = row[c];
    if (v === undefined) v = null;
    if (def.numeric.includes(c)) {
      if (v === '' || v === null) return c === 'deleted' ? 0 : null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }
    return v === '' ? '' : v === null ? null : String(v);
  });
  run(
    `INSERT INTO ${def.table} (${cols.join(',')}) VALUES (${placeholders})
     ON CONFLICT(${def.pk}) DO UPDATE SET ${updates}`,
    values,
  );
}

/** a が b より新しいか。形式差に強いよう Date.parse で数値化して比較(不能時は文字列)。 */
function tsNewer(a: unknown, b: unknown): boolean {
  const na = Date.parse(String(a ?? ''));
  const nb = Date.parse(String(b ?? ''));
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na > nb;
  return String(a ?? '') > String(b ?? '');
}

async function postJson(url: string, body: any): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, token: getSheetToken() || undefined }),
  });
  if (!resp.ok) throw new Error(`サーバー応答エラー (HTTP ${resp.status})`);
  return resp.json();
}

/** 接続テスト(ping)。成功すれば true。 */
export async function testConnection(url: string): Promise<boolean> {
  const resp = await fetch(buildUrl(url, { action: 'ping' }));
  if (!resp.ok) return false;
  const data = await resp.json();
  return data?.ok === true;
}

/** 同期本体。pull(全件) → LWW マージ → push(前回同期以降の変更) */
export async function syncNow(): Promise<SyncResult> {
  const url = getSheetUrl();
  if (!url) throw new Error('同期先 URL が未設定です。設定画面で入力してください。');
  if (_busy) throw new Error('同期処理中です。少し待ってください。');
  _busy = true;
  try {

  // ===== PULL(全件取得して LWW でローカルへ反映) =====
  const pullResp = await fetch(buildUrl(url, { action: 'pull' }));
  if (!pullResp.ok) throw new Error(`取得エラー (HTTP ${pullResp.status})`);
  const pullData = await pullResp.json();
  if (pullData?.error) throw new Error(`サーバー: ${pullData.error}`);
  const tables = pullData?.tables ?? {};

  let pulled = 0;
  tx(() => {
    for (const def of SYNC_TABLES) {
      const remoteRows: Record<string, any>[] = tables[def.table] ?? [];
      for (const r of remoteRows) {
        const pkVal = r[def.pk];
        if (pkVal === undefined || pkVal === null || pkVal === '') continue;
        const local = first<{ updated_at: string | null }>(
          `SELECT updated_at FROM ${def.table} WHERE ${def.pk} = ?`,
          [String(pkVal)],
        );
        if (!local || tsNewer(r.updated_at, local.updated_at)) {
          upsertRaw(def, r);
          pulled++;
        }
      }
    }
  });

  // ===== PUSH(前回同期以降に変更されたローカル行) =====
  const lastSync = getLastSync() ?? '';
  const payloadTables: Record<string, any[]> = {};
  let pushed = 0;
  for (const def of SYNC_TABLES) {
    const cols = [def.pk, ...def.columns];
    const rows = all<Record<string, any>>(
      `SELECT ${cols.join(',')} FROM ${def.table} WHERE COALESCE(updated_at,'') > ?`,
      [lastSync],
    );
    payloadTables[def.table] = rows;
    pushed += rows.length;
  }
  const pushResp = await postJson(url, { action: 'push', tables: payloadTables });
  if (pushResp?.error) throw new Error(`サーバー: ${pushResp.error}`);

  setLocal('last_sync_at', nowUtcIso());
  bumpData();
  return { pulled, pushed };
  } finally {
    _busy = false;
  }
}

/**
 * 自動同期。URL未設定/同期中/直近15秒以内ならスキップ。
 * 変化があった時だけログに残し、失敗(オフライン等)は黙ってスキップする。
 */
export async function autoSync(): Promise<void> {
  if (!getSheetUrl() || _busy) return;
  const now = Date.now();
  if (now - _lastAutoAt < 15000) return;
  _lastAutoAt = now;
  try {
    const r = await syncNow();
    if (r.pulled + r.pushed > 0) {
      logAction('同期', null, `自動 取込${r.pulled}/送信${r.pushed}`);
    }
  } catch {
    // オフライン等は黙ってスキップ
  }
}
