import { useMemo } from 'react';

import { Screen } from '@/ui/Screen';
import { SectionLabel, Notice, Muted } from '@/ui/primitives';
import { Table, Column } from '@/ui/Table';
import { useReload } from '@/hooks/useReload';
import { listSpawning } from '@/db/spawning';
import { maleRanking, femaleRanking, pairRanking, recommendedPairs, RankRow } from '@/lib/analysis';

const rankCols = (keyLabel: string): Column<any>[] => [
  { key: 'key', label: keyLabel, width: 140 },
  { key: 'trials', label: '試行', width: 44, align: 'right' },
  { key: 'successRate', label: '成功率%', width: 64, align: 'right' },
  { key: 'avgEggs', label: '平均卵', width: 60, align: 'right' },
  { key: 'avgRate', label: '平均受精%', width: 72, align: 'right' },
  { key: 'lastDate', label: '最終試行', width: 96 },
  { key: 'stars', label: '信頼度', width: 56 },
];

export default function AnalysisScreen() {
  const tick = useReload();
  const data = useMemo(() => {
    const recs = listSpawning();
    return {
      empty: recs.length === 0,
      male: maleRanking(recs),
      female: femaleRanking(recs),
      pair: pairRanking(recs),
      reco: recommendedPairs(recs),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (data.empty) {
    return (
      <Screen>
        <Notice kind="info">
          まだ産卵成績が登録されていません。記録が溜まると分析できるようになります。
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>過去の産卵成績から、成功率の高い水槽・ペアを自動で算出します。</Muted>

      <SectionLabel>♂ オス側水槽ランキング</SectionLabel>
      <Table columns={rankCols('♂水槽')} rows={data.male} />

      <SectionLabel>♀ メス側水槽ランキング</SectionLabel>
      <Table columns={rankCols('♀水槽')} rows={data.female} />

      <SectionLabel>💞 ペア別ランキング</SectionLabel>
      <Table columns={rankCols('ペア')} rows={data.pair} />

      <SectionLabel>✨ 次回おすすめペア Top 5</SectionLabel>
      <Muted>成功率×0.5 + 平均採卵数×0.3 + 受精率×0.2（試行3回以上）</Muted>
      {data.reco.length === 0 ? (
        <Notice kind="info">試行3回以上のペアがまだありません</Notice>
      ) : (
        <Table
          columns={[
            { key: 'key', label: 'ペア', width: 140 },
            { key: 'score', label: 'スコア', width: 56, align: 'right' },
            { key: 'trials', label: '試行', width: 44, align: 'right' },
            { key: 'successRate', label: '成功率%', width: 64, align: 'right' },
            { key: 'avgEggs', label: '平均卵', width: 60, align: 'right' },
            { key: 'avgRate', label: '平均受精%', width: 72, align: 'right' },
          ]}
          rows={data.reco}
        />
      )}
    </Screen>
  );
}
