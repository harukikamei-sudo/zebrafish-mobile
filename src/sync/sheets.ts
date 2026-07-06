/**
 * Google Sheets 双方向同期。
 * Google Apps Script の Web アプリ(doGet/doPost, JSON)をエンドポイントにして、
 * テーブルごとにレコード単位の Last-Write-Wins(updated_at 比較) でマージする。
 * 削除は deleted=1 のトンボストーンとして同期される。
 *
 * 通信は原則 1 回(action='sync': push と増分 pull を同時に処理)。増分 pull は
 * サーバー時計で押す srv_at 透かしに基づくため端末間の時計ズレの影響を受けない。
 * シートを直接手編集した場合は srv_at が動かないので、1 日 1 回の全件 pull で回収する。
 * 旧バージョンの GAS(sync 未対応)には従来の pull→push 2 回通信へフォールバックする。
 */
import { all, run, tx } from '../db/database';
import { SYNC_TABLES, SyncTableDef } from '../db/schema';
import { getLocal, setLocal } from '../db/settings';
import { DEFAULT_SHEET_URL, DEFAULT_SHEET_TOKEN } from './config';
import { logAction } from '../db/logs';
import { repairTrialNoDuplicates } from '../db/trials';
import { nowUtcIso, toJstWall } from '../lib/time';
import { bumpData } from '../state/store';

/**
 * JST 壁時計で保持する時刻列。Sheets がセルを日付型と解釈すると pull 時に UTC ISO へ
 * 化けることがあるため、取り込み時にここの列だけ JST 壁時計へ正規化してから保存する。
 * (updated_at は UTC ISO のまま保持するので含めない)
 */
const WALL_CLOCK_COLS = new Set([
  'fed_at',
  'occurred_at',
  'setup_at',
  'divider_removed_at',
  'egg_collected_at',
  'returned_at',
  'set_date',
]);

/**
 * 日付のみ("YYYY-MM-DD")で保持する列。Sheets 経由で日付型・UTC ISO に化けた場合は
 * JST に直したうえで日付部分だけ残す(時刻が付くと表示や「今日」判定が崩れる)。
 */
const DATE_ONLY_COLS = new Set(['planned_date', 'spawning_date']);

// 多重実行ガードと自動同期のデバウンス
let _busy = false;
let _lastAutoAt = 0;

export function isSyncing(): boolean {
  return _busy;
}

/** 同期先 URL。ローカル設定が空なら内蔵の既定 URL(配信時注入)を使う。 */
export function getSheetUrl(): string {
  return (getLocal('sheet_url', '') ?? '').trim() || DEFAULT_SHEET_URL;
}

export function setSheetUrl(url: string): void {
  // 内蔵の既定 URL と同じ値は保存しない。設定画面は入力欄に既定値を表示するため、
  // そのまま保存すると既定がローカルに焼き付き、配信側で既定 URL を更新しても
  // その端末だけ古い同期先へ送り続けてしまう。
  const v = url.trim();
  setLocal('sheet_url', v && v !== DEFAULT_SHEET_URL ? v : null);
}

export function getLastSync(): string | null {
  return getLocal('last_sync_at', null);
}

/**
 * 共有トークン。ローカル設定が空のときは:
 * - ローカル URL も未設定(＝内蔵の既定 URL を使用)なら内蔵の既定トークンを使う
 * - ローカル URL を独自入力している場合は、既定トークンを混ぜない(空)
 */
export function getSheetToken(): string {
  const localToken = (getLocal('sheet_token', '') ?? '').trim();
  if (localToken) return localToken;
  const localUrl = (getLocal('sheet_url', '') ?? '').trim();
  return localUrl ? '' : DEFAULT_SHEET_TOKEN;
}

export function setSheetToken(token: string): void {
  // URL と同様、内蔵の既定トークンと同じ値は焼き付けない
  const v = token.trim();
  setLocal('sheet_token', v && v !== DEFAULT_SHEET_TOKEN ? v : null);
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
    if (WALL_CLOCK_COLS.has(c) && v !== null && v !== '') {
      return toJstWall(String(v));
    }
    if (DATE_ONLY_COLS.has(c) && v !== null && v !== '') {
      const wall = toJstWall(String(v));
      return wall ? wall.slice(0, 10) : String(v);
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

/** 受信テーブル群をレコード単位 LWW でローカルへ反映し、適用件数を返す */
function mergeTables(tables: Record<string, Record<string, any>[]>): number {
  let pulled = 0;
  tx(() => {
    for (const def of SYNC_TABLES) {
      const remoteRows: Record<string, any>[] = tables[def.table] ?? [];
      if (!remoteRows.length) continue;
      // 行ごとの SELECT は全件 pull 時に数千回になるため、一括で読んで Map 化する
      const locals = all<{ pk: any; updated_at: string | null }>(
        `SELECT ${def.pk} AS pk, updated_at FROM ${def.table}`,
      );
      const localTs = new Map(locals.map((r) => [String(r.pk), r.updated_at]));
      for (const r of remoteRows) {
        const pkVal = r[def.pk];
        if (pkVal === undefined || pkVal === null || pkVal === '') continue;
        const key = String(pkVal);
        if (!localTs.has(key) || tsNewer(r.updated_at, localTs.get(key))) {
          upsertRaw(def, r);
          pulled++;
        }
      }
    }
  });
  return pulled;
}

/** 指定時刻より後に変更されたローカル行を push 用ペイロードに集める(空テーブルは省く) */
function buildPushPayload(since: string): { tables: Record<string, any[]>; count: number } {
  const tables: Record<string, any[]> = {};
  let count = 0;
  for (const def of SYNC_TABLES) {
    const cols = [def.pk, ...def.columns];
    const rows = all<Record<string, any>>(
      `SELECT ${cols.join(',')} FROM ${def.table} WHERE COALESCE(updated_at,'') > ?`,
      [since],
    );
    if (rows.length) {
      tables[def.table] = rows;
      count += rows.length;
    }
  }
  return { tables, count };
}

/** 旧 GAS 向けフォールバック: 従来どおり pull(全件)→push の 2 回通信 */
async function legacySync(url: string, pushTables: Record<string, any[]>): Promise<number> {
  const pullResp = await fetch(buildUrl(url, { action: 'pull' }));
  if (!pullResp.ok) throw new Error(`取得エラー (HTTP ${pullResp.status})`);
  const pullData = await pullResp.json();
  if (pullData?.error) throw new Error(`サーバー: ${pullData.error}`);
  const pulled = mergeTables(pullData?.tables ?? {});
  const pushResp = await postJson(url, { action: 'push', tables: pushTables });
  if (pushResp?.error) throw new Error(`サーバー: ${pushResp.error}`);
  return pulled;
}

const FULL_PULL_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** 同期本体。push(前回同期以降の変更) と pull(サーバー側増分) を 1 リクエストで行う */
export async function syncNow(): Promise<SyncResult> {
  const url = getSheetUrl();
  if (!url) throw new Error('同期先 URL が未設定です。設定画面で入力してください。');
  if (_busy) throw new Error('同期処理中です。少し待ってください。');
  _busy = true;
  try {
    // 基準時刻は同期の「開始前」に取る。最後に取ると、通信中に行った編集の
    // updated_at が基準時刻より過去になり、その行が二度と push されなくなる
    // (前日セット完了が他端末へ届かないバグの原因)。開始前なら次回必ず拾われ、
    // 重複送信になってもサーバー側 LWW が弾くだけで無害。
    const cutoff = nowUtcIso();

    // 過去バグで取り残された行の救済: 一度だけ全行を push する。
    // サーバー側 LWW がシートより新しい行だけ採用するので安全。
    const rescued = getLocal('repush_rescue_v1', null) === 'done';
    const lastSync = rescued ? (getLastSync() ?? '') : '';
    const { tables: pushTables, count: pushed } = buildPushPayload(lastSync);

    // 増分 pull の透かし(サーバー時計)。期限切れ・未保持なら全件 pull('')
    const fullAt = getLocal('last_full_pull_at', '') ?? '';
    const fullExpired = !fullAt || Date.now() - Date.parse(fullAt) > FULL_PULL_INTERVAL_MS;
    const since = fullExpired ? '' : (getLocal('server_since', '') ?? '');

    let pulled = 0;
    const resp = await postJson(url, { action: 'sync', since, tables: pushTables });
    if (resp?.error === 'unknown action') {
      // GAS が旧バージョン(要: Code.gs 再デプロイ)。従来方式で同期する
      pulled = await legacySync(url, pushTables);
      setLocal('server_since', null);
    } else {
      if (resp?.error) throw new Error(`サーバー: ${resp.error}`);
      pulled = mergeTables(resp?.tables ?? {});
      if (resp?.serverNow) setLocal('server_since', String(resp.serverNow));
      if (!since) setLocal('last_full_pull_at', nowUtcIso());
    }

    // 複数端末が同時採番して trial_no が重複した場合はここで振り直す。
    // 修正行は updated_at が cutoff より新しくなるため、次回の同期で必ず push される。
    if (pulled > 0) repairTrialNoDuplicates();

    setLocal('last_sync_at', cutoff);
    if (!rescued) setLocal('repush_rescue_v1', 'done');
    bumpData();
    return { pulled, pushed };
  } finally {
    _busy = false;
  }
}

/**
 * 自動同期(起動時・復帰時・定期)。URL未設定/同期中/直近15秒以内ならスキップ。
 * 変化があった時だけログに残し、失敗(オフライン等)は黙ってスキップする。
 */
export async function autoSync(): Promise<void> {
  if (Date.now() - _lastAutoAt < 15000) return;
  await runAutoSync();
}

async function runAutoSync(): Promise<void> {
  if (!getSheetUrl() || _busy) return;
  _lastAutoAt = Date.now();
  try {
    const r = await syncNow();
    if (r.pulled + r.pushed > 0) {
      logAction('同期', null, `自動 取込${r.pulled}/送信${r.pushed}`);
    }
  } catch {
    // オフライン等は黙ってスキップ。デバウンスは戻し、次のトリガで即再試行できるようにする
    _lastAutoAt = 0;
  }
}

// ===== 書込直後の自動同期 =====
// DB 書込(bumpData)の数秒後にまとめて同期し、他端末へすぐ届くようにする。
// 連続した記録(まとめて入力など)はデバウンスで 1 回の通信にまとめる。
let _kickTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoSync(delayMs = 3000): void {
  // 同期処理自身も完了時に bumpData を呼ぶ(その間 _busy=true)。
  // ここで弾かないと「同期→bumpData→また同期」の無限ループになる。
  if (_busy || !getSheetUrl()) return;
  armKick(delayMs);
}

function armKick(delayMs: number): void {
  if (_kickTimer) clearTimeout(_kickTimer);
  _kickTimer = setTimeout(() => {
    _kickTimer = null;
    if (_busy) {
      // 別の同期が実行中。今回の書込はその push に乗っていない可能性があるため後で改めて
      armKick(delayMs);
      return;
    }
    void runAutoSync();
  }, delayMs);
}
