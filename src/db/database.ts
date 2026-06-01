import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

import { SCHEMA_SQL } from './schema';
import { DEFAULT_RACKS, DEFAULT_TIERS } from '../lib/constants';
import { toJstWall } from '../lib/time';

/** 初期投入データの更新時刻は最古に固定。こうすると Sheets 側に設定があれば常にそちらが優先される。 */
const EPOCH = '1970-01-01T00:00:00.000Z';

/** JST 壁時計で保持すべきドメイン時刻列(updated_at は UTC ISO のままなので含めない)。 */
const WALL_CLOCK_COLUMNS: Record<string, string[]> = {
  feeding_logs: ['fed_at'],
  activity_logs: ['occurred_at'],
  mating_trials: ['setup_at', 'divider_removed_at', 'egg_collected_at', 'returned_at'],
};

let _db: SQLite.SQLiteDatabase | null = null;

/** DB シングルトン。初回アクセス時にスキーマ初期化と初期データ投入を行う。 */
export function db(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('zebrafish.db');
    _db.execSync('PRAGMA journal_mode = WAL;');
    _db.execSync(SCHEMA_SQL);
    seed(_db);
    migrateWallClockTimes(_db);
  }
  return _db;
}

/**
 * 過去の同期バグ(Sheets がセルを日付型と解釈し UTC ISO で取り込まれた)で
 * ドメイン時刻列に "…T…Z" 形式が混入した既存行を、一度だけ JST 壁時計へ正規化する。
 * 壁時計表記は 'T' を含まないため対象から外れ、変換不要な行は更新しない(冪等)。
 */
function migrateWallClockTimes(conn: SQLite.SQLiteDatabase): void {
  for (const [table, cols] of Object.entries(WALL_CLOCK_COLUMNS)) {
    for (const col of cols) {
      const rows = conn.getAllSync<{ rid: number; v: string }>(
        `SELECT rowid AS rid, ${col} AS v FROM ${table} WHERE ${col} LIKE '%T%'`,
      );
      for (const r of rows) {
        const fixed = toJstWall(r.v);
        if (fixed && fixed !== r.v) {
          conn.runSync(`UPDATE ${table} SET ${col} = ? WHERE rowid = ?`, [fixed, r.rid]);
        }
      }
    }
  }
}

function seed(conn: SQLite.SQLiteDatabase) {
  const ts = EPOCH;
  const ensure = (key: string, value: string) => {
    const row = conn.getFirstSync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ? AND deleted = 0',
      [key],
    );
    if (!row) {
      conn.runSync(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at, deleted) VALUES (?, ?, ?, 0)',
        [key, value, ts],
      );
    }
  };
  ensure('racks', DEFAULT_RACKS.join(','));
  ensure('tiers', DEFAULT_TIERS.join(','));
}

/** 複数行取得 */
export function all<T = any>(sql: string, params: SQLite.SQLiteBindValue[] = []): T[] {
  return db().getAllSync<T>(sql, params);
}

/** 1行取得(無ければ null) */
export function first<T = any>(sql: string, params: SQLite.SQLiteBindValue[] = []): T | null {
  return db().getFirstSync<T>(sql, params) ?? null;
}

/** 書き込み(INSERT/UPDATE/DELETE) */
export function run(sql: string, params: SQLite.SQLiteBindValue[] = []): SQLite.SQLiteRunResult {
  return db().runSync(sql, params);
}

/** トランザクション */
export function tx(fn: () => void): void {
  db().withTransactionSync(fn);
}

/** UUID 生成(同期主キー用) */
export function uuid(): string {
  return Crypto.randomUUID();
}
