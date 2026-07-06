import { all, run, uuid } from './database';
import { nowUtcIso } from '../lib/time';

export interface SpawningRecord {
  id: string;
  spawning_date: string | null;
  male_parent_id: string | null;
  female_parent_id: string | null;
  egg_count: number | null;
  fertilization_rate: number | null;
}

export function listSpawning(): SpawningRecord[] {
  return all<SpawningRecord>(
    `SELECT id, spawning_date, male_parent_id, female_parent_id, egg_count, fertilization_rate
     FROM spawning_records WHERE deleted = 0`,
  );
}

export function countSpawning(): number {
  const rows = all<{ n: number }>(
    'SELECT COUNT(*) AS n FROM spawning_records WHERE deleted = 0',
  );
  return rows[0]?.n ?? 0;
}

/** 受精率の推移(日付順) */
export function fertilizationSeries(): { spawning_date: string; fertilization_rate: number }[] {
  return all(
    `SELECT spawning_date, fertilization_rate FROM spawning_records
     WHERE deleted = 0 AND spawning_date IS NOT NULL AND fertilization_rate IS NOT NULL
     ORDER BY spawning_date`,
  );
}

export interface SpawningInput {
  spawning_date: string | null;
  male_parent_id: string | null;
  female_parent_id: string | null;
  egg_count: number;
  /** 受精率(%)。未計測なら null(0% と区別して集計する) */
  fertilization_rate: number | null;
}

/** 産卵成績を1件追加し、新しい id を返す */
export function addSpawning(input: SpawningInput): string {
  const id = uuid();
  run(
    `INSERT INTO spawning_records
       (id, spawning_date, male_parent_id, female_parent_id, egg_count, fertilization_rate, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      input.spawning_date,
      input.male_parent_id,
      input.female_parent_id,
      input.egg_count,
      input.fertilization_rate,
      nowUtcIso(),
    ],
  );
  return id;
}
