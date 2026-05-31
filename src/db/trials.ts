import { all, first, run, uuid } from './database';
import { nowIso, nowUtcIso } from '../lib/time';
import { addSpawning } from './spawning';
import type { TrialStatus } from '../lib/constants';
import { TRIAL_ACTIVE_STATUSES } from '../lib/constants';

export interface Trial {
  id: string;
  trial_no: number | null;
  planned_date: string;
  male_id: string | null;
  female_id: string | null;
  source_tank_male: string | null;
  source_tank_female: string | null;
  breeding_tank_id: string | null;
  status: TrialStatus;
  setup_at: string | null;
  divider_removed_at: string | null;
  egg_collected_at: string | null;
  returned_at: string | null;
  spawning_history_id: string | null;
  notes: string | null;
  male_tag: string | null;
  female_tag: string | null;
}

const COLS =
  'id, trial_no, planned_date, male_id, female_id, source_tank_male, source_tank_female, ' +
  'breeding_tank_id, status, setup_at, divider_removed_at, egg_collected_at, returned_at, ' +
  'spawning_history_id, notes, male_tag, female_tag';

function nextTrialNo(): number {
  const row = first<{ mx: number | null }>(
    'SELECT MAX(trial_no) AS mx FROM mating_trials',
  );
  return (row?.mx ?? 0) + 1;
}

export interface NewTrial {
  planned_date: string;
  source_tank_male: string | null;
  source_tank_female: string | null;
  breeding_tank_id: string | null;
  notes: string | null;
  male_tag: string | null;
  female_tag: string | null;
}

/** 新規トライアルを1件作成し、表示番号を返す */
export function createTrial(input: NewTrial): number {
  const no = nextTrialNo();
  run(
    `INSERT INTO mating_trials
       (id, trial_no, planned_date, male_id, female_id, source_tank_male, source_tank_female,
        breeding_tank_id, status, notes, male_tag, female_tag, updated_at, deleted)
     VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, '計画中', ?, ?, ?, ?, 0)`,
    [
      uuid(),
      no,
      input.planned_date,
      input.source_tank_male,
      input.source_tank_female,
      input.breeding_tank_id,
      input.notes,
      input.male_tag,
      input.female_tag,
      nowUtcIso(),
    ],
  );
  return no;
}

export function activeTrials(): Trial[] {
  const placeholders = TRIAL_ACTIVE_STATUSES.map(() => '?').join(',');
  return all<Trial>(
    `SELECT ${COLS} FROM mating_trials
     WHERE deleted = 0 AND status IN (${placeholders})
     ORDER BY planned_date, trial_no`,
    [...TRIAL_ACTIVE_STATUSES],
  );
}

export interface DoneTrial extends Trial {
  egg_count: number | null;
  fertilization_rate: number | null;
}

export function doneTrials(): DoneTrial[] {
  return all<DoneTrial>(
    `SELECT t.id, t.trial_no, t.planned_date, t.male_id, t.female_id,
            t.source_tank_male, t.source_tank_female, t.breeding_tank_id, t.status,
            t.setup_at, t.divider_removed_at, t.egg_collected_at, t.returned_at,
            t.spawning_history_id, t.notes, t.male_tag, t.female_tag,
            s.egg_count, s.fertilization_rate
     FROM mating_trials t
     LEFT JOIN spawning_records s ON t.spawning_history_id = s.id AND s.deleted = 0
     WHERE t.deleted = 0 AND t.status IN ('戻し済み','中止')
     ORDER BY t.planned_date DESC, t.trial_no DESC`,
  );
}

export function countActive(): number {
  const placeholders = TRIAL_ACTIVE_STATUSES.map(() => '?').join(',');
  const row = first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM mating_trials WHERE deleted = 0 AND status IN (${placeholders})`,
    [...TRIAL_ACTIVE_STATUSES],
  );
  return row?.n ?? 0;
}

function update(id: string, sets: string, params: any[]): void {
  run(`UPDATE mating_trials SET ${sets}, updated_at = ? WHERE id = ?`, [...params, nowUtcIso(), id]);
}

export function markSetup(id: string): void {
  update(id, "status = '前日セット済み', setup_at = ?", [nowIso()]);
}

export function markDividerRemoved(id: string): void {
  update(id, 'divider_removed_at = ?', [nowIso()]);
}

export function markReturned(id: string): void {
  update(id, "status = '戻し済み', returned_at = ?", [nowIso()]);
}

export function cancelTrial(id: string): void {
  update(id, "status = '中止'", []);
}

/** 採卵結果を登録し、産卵成績を自動生成してトライアルを採卵済みにする */
export function collectEggs(
  trial: Trial,
  eggs: number,
  rate: number,
): void {
  const histId = addSpawning({
    spawning_date: trial.planned_date,
    male_parent_id: trial.source_tank_male,
    female_parent_id: trial.source_tank_female,
    egg_count: eggs,
    fertilization_rate: rate,
  });
  update(trial.id, "status = '採卵済み', egg_collected_at = ?, spawning_history_id = ?", [
    nowIso(),
    histId,
  ]);
}
