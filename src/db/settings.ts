import { all, first, run } from './database';
import { nowUtcIso } from '../lib/time';
import { DEFAULT_RACKS, DEFAULT_TIERS } from '../lib/constants';

// ===== 共有設定(app_settings: Sheets と同期) =====

export function getSetting(key: string, dflt: string | null = null): string | null {
  const row = first<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ? AND deleted = 0',
    [key],
  );
  return row ? row.value : dflt;
}

export function setSetting(key: string, value: string): void {
  run(
    `INSERT INTO app_settings (key, value, updated_at, deleted) VALUES (?, ?, ?, 0)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, deleted = 0`,
    [key, value, nowUtcIso()],
  );
}

function parseList(raw: string | null, fallback: string[]): string[] {
  if (!raw) return [...fallback];
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : [...fallback];
}

export function loadRacks(): string[] {
  return parseList(getSetting('racks', DEFAULT_RACKS.join(',')), DEFAULT_RACKS);
}

export function loadTiers(): string[] {
  return parseList(getSetting('tiers', DEFAULT_TIERS.join(',')), DEFAULT_TIERS);
}

export interface OpResult {
  ok: boolean;
  msg: string;
}

export function addRack(name: string): OpResult {
  const n = name.trim();
  if (!n || n.length > 16) return { ok: false, msg: 'ラック名は1〜16文字で入力してください' };
  const cur = loadRacks();
  if (cur.includes(n)) return { ok: false, msg: `ラック ${n} は既に存在します` };
  setSetting('racks', [...cur, n].join(','));
  return { ok: true, msg: `ラック ${n} を追加しました` };
}

export function removeRack(name: string): OpResult {
  const cur = loadRacks();
  if (!cur.includes(name)) return { ok: false, msg: '存在しないラックです' };
  if (cur.length <= 1) return { ok: false, msg: 'ラックは最低1つ必要です' };
  setSetting('racks', cur.filter((r) => r !== name).join(','));
  return { ok: true, msg: `ラック ${name} を削除しました` };
}

export function addTier(letter: string): OpResult {
  const l = letter.trim().toUpperCase();
  if (!l || !/^[A-Z]{1,2}$/.test(l))
    return { ok: false, msg: '段は1〜2文字のアルファベットで入力してください' };
  const cur = loadTiers();
  if (cur.includes(l)) return { ok: false, msg: `段 ${l} は既に存在します` };
  setSetting('tiers', [...cur, l].join(','));
  return { ok: true, msg: `段 ${l} を追加しました` };
}

export function removeTier(letter: string): OpResult {
  const cur = loadTiers();
  if (!cur.includes(letter)) return { ok: false, msg: '存在しない段です' };
  if (cur.length <= 1) return { ok: false, msg: '段は最低1つ必要です' };
  setSetting('tiers', cur.filter((t) => t !== letter).join(','));
  return { ok: true, msg: `段 ${letter} を削除しました` };
}

// ===== 端末ローカル設定(local_settings: 同期しない) =====

export function getLocal(key: string, dflt: string | null = null): string | null {
  const row = first<{ value: string }>('SELECT value FROM local_settings WHERE key = ?', [key]);
  return row ? row.value : dflt;
}

export function setLocal(key: string, value: string | null): void {
  if (value === null) {
    run('DELETE FROM local_settings WHERE key = ?', [key]);
    return;
  }
  run(
    `INSERT INTO local_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

/** ログ記録用の担当者名(端末ローカル) */
export function getActor(): string | null {
  const v = getLocal('actor_name', '');
  return v && v.trim() ? v.trim() : null;
}
