import { all, run, uuid } from './database';
import { nowIso, nowUtcIso } from '../lib/time';
import { getActor } from './settings';

export interface ActivityLog {
  id: string;
  occurred_at: string;
  category: string;
  actor: string | null;
  target: string | null;
  details: string | null;
}

/** アクション履歴を1件追加。担当者は local_settings の actor_name から自動取得。失敗は握りつぶす。 */
export function logAction(category: string, target?: string | null, details?: string | null): void {
  try {
    run(
      `INSERT INTO activity_logs (id, occurred_at, category, actor, target, details, updated_at, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [uuid(), nowIso(), category, getActor(), target ?? null, details ?? null, nowUtcIso()],
    );
  } catch {
    // ログ失敗は本処理を止めない
  }
}

export function recentLogs(limit = 5): ActivityLog[] {
  return all<ActivityLog>(
    `SELECT id, occurred_at, category, actor, target, details
     FROM activity_logs WHERE deleted = 0
     ORDER BY occurred_at DESC, rowid DESC LIMIT ?`,
    [limit],
  );
}

export function allLogs(): ActivityLog[] {
  return all<ActivityLog>(
    `SELECT id, occurred_at, category, actor, target, details
     FROM activity_logs WHERE deleted = 0
     ORDER BY occurred_at DESC, rowid DESC`,
  );
}

/** 指定日(YYYY-MM-DD)より前のログを論理削除 */
export function purgeBefore(dateStr: string): number {
  const cutoff = `${dateStr} 00:00:00`;
  const res = run(
    'UPDATE activity_logs SET deleted = 1, updated_at = ? WHERE occurred_at < ? AND deleted = 0',
    [nowUtcIso(), cutoff],
  );
  return res.changes;
}
