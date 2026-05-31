/**
 * SQLite スキーマ定義。
 * 元 app.py の最終スキーマを移植しつつ、Google Sheets との双方向同期に備えて
 * 全同期テーブルに updated_at(UTC ISO) と deleted(論理削除フラグ) を持たせる。
 * 端末間で衝突しないよう、AUTOINCREMENT だったテーブルは uuid 文字列を主キーにする。
 * (元の individuals テーブルは現UIで未使用のため移植しない)
 */

/** 同期対象テーブルの記述子。sync エンジンが汎用的に pull/push するのに使う。 */
export interface SyncTableDef {
  /** テーブル名(= Google Sheets のシート名) */
  table: string;
  /** 主キー列名 */
  pk: string;
  /** 主キーを除く全データ列(updated_at, deleted を含む) */
  columns: string[];
  /** 数値として扱う列(Sheets から来た値を数値へ強制変換する) */
  numeric: string[];
}

export const SYNC_TABLES: SyncTableDef[] = [
  {
    table: 'tanks',
    pk: 'tank_id',
    columns: [
      'rack',
      'tier',
      'col_no',
      'health_status',
      'memo',
      'male_count',
      'female_count',
      'unknown_count',
      'lineage',
      'set_date',
      'updated_at',
      'deleted',
    ],
    numeric: ['col_no', 'male_count', 'female_count', 'unknown_count', 'deleted'],
  },
  {
    table: 'feeding_logs',
    pk: 'id',
    columns: ['fed_at', 'memo', 'updated_at', 'deleted'],
    numeric: ['deleted'],
  },
  {
    table: 'spawning_records',
    pk: 'id',
    columns: [
      'spawning_date',
      'male_parent_id',
      'female_parent_id',
      'egg_count',
      'fertilization_rate',
      'updated_at',
      'deleted',
    ],
    numeric: ['egg_count', 'fertilization_rate', 'deleted'],
  },
  {
    table: 'mating_trials',
    pk: 'id',
    columns: [
      'trial_no',
      'planned_date',
      'male_id',
      'female_id',
      'source_tank_male',
      'source_tank_female',
      'breeding_tank_id',
      'status',
      'setup_at',
      'divider_removed_at',
      'egg_collected_at',
      'returned_at',
      'spawning_history_id',
      'notes',
      'male_tag',
      'female_tag',
      'updated_at',
      'deleted',
    ],
    numeric: ['trial_no', 'deleted'],
  },
  {
    table: 'activity_logs',
    pk: 'id',
    columns: ['occurred_at', 'category', 'actor', 'target', 'details', 'updated_at', 'deleted'],
    numeric: ['deleted'],
  },
  {
    table: 'app_settings',
    pk: 'key',
    columns: ['value', 'updated_at', 'deleted'],
    numeric: ['deleted'],
  },
];

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tanks (
  tank_id        TEXT PRIMARY KEY,
  rack           TEXT,
  tier           TEXT,
  col_no         INTEGER,
  health_status  TEXT,
  memo           TEXT,
  male_count     INTEGER DEFAULT 0,
  female_count   INTEGER DEFAULT 0,
  unknown_count  INTEGER DEFAULT 0,
  lineage        TEXT,
  set_date       TEXT,
  updated_at     TEXT,
  deleted        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feeding_logs (
  id          TEXT PRIMARY KEY,
  fed_at      TEXT NOT NULL,
  memo        TEXT,
  updated_at  TEXT,
  deleted     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spawning_records (
  id                  TEXT PRIMARY KEY,
  spawning_date       TEXT,
  male_parent_id      TEXT,
  female_parent_id    TEXT,
  egg_count           INTEGER,
  fertilization_rate  REAL,
  updated_at          TEXT,
  deleted             INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mating_trials (
  id                   TEXT PRIMARY KEY,
  trial_no             INTEGER,
  planned_date         TEXT NOT NULL,
  male_id              TEXT,
  female_id            TEXT,
  source_tank_male     TEXT,
  source_tank_female   TEXT,
  breeding_tank_id     TEXT,
  status               TEXT NOT NULL DEFAULT '計画中',
  setup_at             TEXT,
  divider_removed_at   TEXT,
  egg_collected_at     TEXT,
  returned_at          TEXT,
  spawning_history_id  TEXT,
  notes                TEXT,
  male_tag             TEXT,
  female_tag           TEXT,
  updated_at           TEXT,
  deleted              INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id           TEXT PRIMARY KEY,
  occurred_at  TEXT NOT NULL,
  category     TEXT NOT NULL,
  actor        TEXT,
  target       TEXT,
  details      TEXT,
  updated_at   TEXT,
  deleted      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT,
  deleted     INTEGER DEFAULT 0
);

-- 端末ローカル専用(同期しない): 担当者名・同期先URL・最終同期時刻など
CREATE TABLE IF NOT EXISTS local_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

CREATE INDEX IF NOT EXISTS idx_feeding_fed_at ON feeding_logs(fed_at);
CREATE INDEX IF NOT EXISTS idx_trials_status ON mating_trials(status);
CREATE INDEX IF NOT EXISTS idx_logs_occurred ON activity_logs(occurred_at);
`;
