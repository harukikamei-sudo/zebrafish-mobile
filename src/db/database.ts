import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

import { SCHEMA_SQL } from './schema';
import { DEFAULT_RACKS, DEFAULT_TIERS } from '../lib/constants';

/** 初期投入データの更新時刻は最古に固定。こうすると Sheets 側に設定があれば常にそちらが優先される。 */
const EPOCH = '1970-01-01T00:00:00.000Z';

let _db: SQLite.SQLiteDatabase | null = null;

/** DB シングルトン。初回アクセス時にスキーマ初期化と初期データ投入を行う。 */
export function db(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('zebrafish.db');
    _db.execSync('PRAGMA journal_mode = WAL;');
    _db.execSync(SCHEMA_SQL);
    seed(_db);
  }
  return _db;
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
