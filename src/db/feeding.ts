import { all, first, run, uuid } from './database';
import { nowIso, nowUtcIso, todayJst } from '../lib/time';

export interface FeedingLog {
  id: string;
  fed_at: string;
  memo: string | null;
}

export function addFeed(memo: string | null = null): void {
  run(
    'INSERT INTO feeding_logs (id, fed_at, memo, updated_at, deleted) VALUES (?, ?, ?, ?, 0)',
    [uuid(), nowIso(), memo, nowUtcIso()],
  );
}

export function todayLogs(): FeedingLog[] {
  return all<FeedingLog>(
    `SELECT id, fed_at, memo FROM feeding_logs
     WHERE deleted = 0 AND substr(fed_at, 1, 10) = ?
     ORDER BY fed_at DESC`,
    [todayJst()],
  );
}

export function countToday(): number {
  const row = first<{ n: number }>(
    `SELECT COUNT(*) AS n FROM feeding_logs WHERE deleted = 0 AND substr(fed_at, 1, 10) = ?`,
    [todayJst()],
  );
  return row?.n ?? 0;
}

export function lastFedAt(): string | null {
  const row = first<{ fed_at: string }>(
    'SELECT fed_at FROM feeding_logs WHERE deleted = 0 ORDER BY fed_at DESC LIMIT 1',
  );
  return row ? row.fed_at : null;
}

export function allFeedingLogs(): FeedingLog[] {
  return all<FeedingLog>(
    'SELECT id, fed_at, memo FROM feeding_logs WHERE deleted = 0 ORDER BY fed_at DESC',
  );
}

/** 本日の直近1件を取り消す(論理削除) */
export function undoLastToday(): boolean {
  const latest = first<{ id: string }>(
    `SELECT id FROM feeding_logs WHERE deleted = 0 AND substr(fed_at, 1, 10) = ?
     ORDER BY fed_at DESC LIMIT 1`,
    [todayJst()],
  );
  if (!latest) return false;
  run('UPDATE feeding_logs SET deleted = 1, updated_at = ? WHERE id = ?', [nowUtcIso(), latest.id]);
  return true;
}
