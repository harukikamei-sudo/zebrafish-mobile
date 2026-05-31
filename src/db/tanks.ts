import { all, first, run, tx } from './database';
import { nowIso, nowUtcIso } from '../lib/time';
import type { HealthStatus } from '../lib/constants';

export interface Tank {
  tank_id: string;
  rack: string | null;
  tier: string | null;
  col_no: number | null;
  health_status: HealthStatus | null;
  memo: string | null;
  male_count: number;
  female_count: number;
  unknown_count: number;
  lineage: string | null;
  set_date: string | null;
}

const SELECT_COLS =
  'tank_id, rack, tier, col_no, health_status, memo, male_count, female_count, unknown_count, lineage, set_date';

export function listTanks(): Tank[] {
  return all<Tank>(
    `SELECT ${SELECT_COLS} FROM tanks WHERE deleted = 0
     ORDER BY rack, tier, col_no, tank_id`,
  );
}

export function getTank(tankId: string): Tank | null {
  return first<Tank>(`SELECT ${SELECT_COLS} FROM tanks WHERE tank_id = ? AND deleted = 0`, [tankId]);
}

export interface TankInput {
  tank_id: string;
  rack: string | null;
  tier: string | null;
  col_no: number | null;
  health_status: HealthStatus;
  memo: string | null;
  male_count: number;
  female_count: number;
  unknown_count: number;
  lineage: string | null;
}

/** 新規登録 or 内容更新(tank_id で UPSERT)。空槽(合計0)は health_status を NULL に。 */
export function upsertTank(input: TankInput): void {
  const total = input.male_count + input.female_count + input.unknown_count;
  const health = total > 0 ? input.health_status : null;
  const existing = getTankRaw(input.tank_id);
  const setDate = existing?.set_date || nowIso();
  run(
    `INSERT INTO tanks
       (tank_id, rack, tier, col_no, health_status, memo,
        male_count, female_count, unknown_count, lineage, set_date, updated_at, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(tank_id) DO UPDATE SET
       rack = excluded.rack, tier = excluded.tier, col_no = excluded.col_no,
       health_status = excluded.health_status, memo = excluded.memo,
       male_count = excluded.male_count, female_count = excluded.female_count,
       unknown_count = excluded.unknown_count, lineage = excluded.lineage,
       set_date = excluded.set_date, updated_at = excluded.updated_at, deleted = 0`,
    [
      input.tank_id,
      input.rack,
      input.tier,
      input.col_no,
      health,
      input.memo,
      input.male_count,
      input.female_count,
      input.unknown_count,
      input.lineage,
      setDate,
      nowUtcIso(),
    ],
  );
}

function getTankRaw(tankId: string): Tank | null {
  return first<Tank>(`SELECT ${SELECT_COLS} FROM tanks WHERE tank_id = ?`, [tankId]);
}

export function deleteTank(tankId: string): void {
  run('UPDATE tanks SET deleted = 1, updated_at = ? WHERE tank_id = ?', [nowUtcIso(), tankId]);
}

/** 2水槽の中身(匹数・系統・健康状態・メモ・入居日)を入れ替える。場所はそのまま。 */
export function swapTanks(a: string, b: string): void {
  const ra = getTank(a);
  const rb = getTank(b);
  if (!ra || !rb) return;
  const ts = nowUtcIso();
  tx(() => {
    const assign = (target: string, src: Tank) => {
      run(
        `UPDATE tanks SET male_count = ?, female_count = ?, unknown_count = ?,
           lineage = ?, set_date = ?, health_status = ?, memo = ?, updated_at = ?
         WHERE tank_id = ?`,
        [
          src.male_count,
          src.female_count,
          src.unknown_count,
          src.lineage,
          src.set_date,
          src.health_status,
          src.memo,
          ts,
          target,
        ],
      );
    };
    assign(a, rb);
    assign(b, ra);
  });
}

/** CSV 一括インポート用の素の UPSERT(検証は呼び出し側で実施) */
export function importTankRow(input: TankInput): void {
  upsertTank(input);
}
