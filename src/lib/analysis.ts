/** 産卵成績の集計・ランキング(元 app.py 成績分析タブの移植) */
import type { SpawningRecord } from '../db/spawning';

export interface RankRow {
  key: string;
  trials: number; // 試行回数
  successes: number; // 成功回数(採卵数>0)
  successRate: number; // 成功率(%)
  avgEggs: number; // 平均採卵数
  avgRate: number; // 平均受精率
  lastDate: string; // 最終試行日
  stars: string; // 信頼度
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function aggregate(
  records: SpawningRecord[],
  keyOf: (r: SpawningRecord) => string,
  starDivisor: number,
): RankRow[] {
  const groups = new Map<string, SpawningRecord[]>();
  for (const r of records) {
    const k = keyOf(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const rows: RankRow[] = [];
  for (const [key, recs] of groups) {
    const trials = recs.length;
    const successes = recs.filter((r) => (r.egg_count ?? 0) > 0).length;
    const eggs = recs.map((r) => r.egg_count ?? 0);
    const rates = recs.map((r) => r.fertilization_rate ?? 0);
    const avgEggs = round1(eggs.reduce((a, b) => a + b, 0) / trials);
    const avgRate = round1(rates.reduce((a, b) => a + b, 0) / trials);
    const lastDate = recs
      .map((r) => r.spawning_date ?? '')
      .reduce((a, b) => (a > b ? a : b), '');
    const stars = '⭐'.repeat(Math.min(Math.floor(trials / starDivisor) + 1, 3));
    rows.push({
      key,
      trials,
      successes,
      successRate: round1((successes / trials) * 100),
      avgEggs,
      avgRate,
      lastDate,
      stars,
    });
  }
  rows.sort((a, b) => b.successRate - a.successRate || b.trials - a.trials);
  return rows;
}

export function maleRanking(records: SpawningRecord[]): RankRow[] {
  return aggregate(records, (r) => r.male_parent_id ?? '—', 3);
}

export function femaleRanking(records: SpawningRecord[]): RankRow[] {
  return aggregate(records, (r) => r.female_parent_id ?? '—', 3);
}

export function pairRanking(records: SpawningRecord[]): RankRow[] {
  const rows = aggregate(
    records,
    (r) => `${r.male_parent_id ?? '—'} × ${r.female_parent_id ?? '—'}`,
    2,
  );
  rows.sort((a, b) => b.successRate - a.successRate || b.avgEggs - a.avgEggs);
  return rows;
}

export interface RecommendedPair extends RankRow {
  score: number;
}

/** 次回おすすめペア Top5(試行3回以上、成功率×0.5 + 平均採卵数×0.3 + 受精率×0.2) */
export function recommendedPairs(records: SpawningRecord[]): RecommendedPair[] {
  const reliable = pairRanking(records).filter((r) => r.trials >= 3);
  const scored = reliable.map((r) => ({
    ...r,
    score: round1(r.successRate * 0.5 + r.avgEggs * 0.3 + r.avgRate * 0.2),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}
