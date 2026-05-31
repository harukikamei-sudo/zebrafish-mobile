/** ドメイン定数(元 app.py より移植) */

export const FEEDS_PER_DAY = 4;
export const FEED_WARN_HOURS = 2; // これを超えたら黄色
export const FEED_ALERT_HOURS = 6; // これを超えたら赤

export const DEFAULT_RACKS = ['wild', 'genom1', 'genom2', 'genom3'];
export const DEFAULT_TIERS = ['A', 'B', 'C', 'D'];
export const COLS: number[] = Array.from({ length: 15 }, (_, i) => i + 1); // 1..15

export type TrialStatus = '計画中' | '前日セット済み' | '採卵済み' | '戻し済み' | '中止';
export const TRIAL_STATUSES: TrialStatus[] = [
  '計画中',
  '前日セット済み',
  '採卵済み',
  '戻し済み',
  '中止',
];
export const TRIAL_ACTIVE_STATUSES: TrialStatus[] = ['計画中', '前日セット済み', '採卵済み'];

export type HealthStatus = '良好' | '隔離中';
export const HEALTH_STATUSES: HealthStatus[] = ['良好', '隔離中'];

/** 棚ビューの色 */
export const HEALTH_COLOR: Record<string, string> = {
  良好: '#B8DDB6',
  隔離中: '#E8B4A8',
};
export const EMPTY_COLOR = '#F5F2EC';

export const TRIAL_BADGE: Record<string, string> = {
  計画中: '🟦',
  前日セット済み: '🟨',
  採卵済み: '🟧',
  戻し済み: '✅',
  中止: '⛔',
};
