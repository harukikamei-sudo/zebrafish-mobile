import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/ui/Screen';
import { SectionLabel, Notice, Btn, Muted, Divider } from '@/ui/primitives';
import { Field, TextField, Select } from '@/ui/inputs';
import { Collapsible } from '@/ui/Collapsible';
import { Table } from '@/ui/Table';
import { LogLines } from '@/ui/LogLines';
import { useReload } from '@/hooks/useReload';
import { bumpData } from '@/state/store';
import { allLogs, purgeBefore, logAction, ActivityLog } from '@/db/logs';
import { addDays, todayJst } from '@/lib/time';
import { toCsv, shareCsv } from '@/lib/csv';
import { S } from '@/lib/theme';

const PERIODS = [
  { label: 'すべての期間', value: 'all' },
  { label: '今日', value: '0' },
  { label: '直近7日', value: '7' },
  { label: '直近30日', value: '30' },
];

export default function LogsScreen() {
  const tick = useReload();
  const [keyword, setKeyword] = useState('');
  const [cat, setCat] = useState('all');
  const [period, setPeriod] = useState('all');
  const [purgeDate, setPurgeDate] = useState(todayJst());

  const all = useMemo(() => allLogs(), [tick]);

  const categories = useMemo(() => {
    const set = new Set(all.map((l) => l.category));
    return ['all', ...Array.from(set).sort()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const view = useMemo(() => {
    let v = all;
    if (cat !== 'all') v = v.filter((l) => l.category === cat);
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      v = v.filter(
        (l) =>
          (l.target ?? '').toLowerCase().includes(kw) ||
          (l.details ?? '').toLowerCase().includes(kw),
      );
    }
    if (period !== 'all') {
      const cutoff = `${addDays(todayJst(), -parseInt(period, 10))} 00:00:00`;
      v = v.filter((l) => l.occurred_at >= cutoff);
    }
    return v;
  }, [all, cat, keyword, period]);

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    view.forEach((l) => map.set(l.category, (map.get(l.category) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [view]);

  const onPurge = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purgeDate)) return;
    const n = purgeBefore(purgeDate);
    logAction('ログ削除', null, `${purgeDate} 以前（${n}件）`);
    bumpData();
  };

  const onExport = () => {
    const rows = view.map((l) => ({
      時刻: l.occurred_at,
      種別: l.category,
      担当: l.actor ?? '',
      対象: l.target ?? '',
      詳細: l.details ?? '',
    }));
    shareCsv('activity_logs', toCsv(rows, ['時刻', '種別', '担当', '対象', '詳細']));
  };

  if (all.length === 0) {
    return (
      <Screen>
        <Notice kind="info">ログがまだありません。何か操作するとここに記録されます。</Notice>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionLabel>🔍 絞り込み</SectionLabel>
      <Field label="種別">
        <Select
          value={cat}
          options={categories.map((c) => ({ label: c === 'all' ? 'すべて' : c, value: c }))}
          onSelect={setCat}
          title="種別で絞り込み"
        />
      </Field>
      <Field label="期間">
        <Select value={period} options={PERIODS} onSelect={setPeriod} title="期間で絞り込み" />
      </Field>
      <Field label="キーワード（対象・詳細）">
        <TextField value={keyword} onChangeText={setKeyword} placeholder="例: wild-A-01" />
      </Field>

      <Muted>
        表示中: {view.length} / 全 {all.length} 件
      </Muted>
      <LogLines rows={view} />

      <Btn label="📥 CSVダウンロード" small disabled={view.length === 0} onPress={onExport} style={{ alignSelf: 'flex-start' }} />

      <Collapsible title="📊 種別別の件数">
        <Table
          columns={[
            { key: 'category', label: '種別', width: 200 },
            { key: 'count', label: '件数', width: 60, align: 'right' },
          ]}
          rows={catCounts}
        />
      </Collapsible>

      <Collapsible title="🗑️ 古いログを削除">
        <Muted>指定した日付より前のログを削除します（同期にも反映されます）。</Muted>
        <Field label="この日付より前を削除 (YYYY-MM-DD)">
          <TextField value={purgeDate} onChangeText={setPurgeDate} placeholder="2026-05-01" keyboardType="numeric" />
        </Field>
        <Divider />
        <Btn label="削除実行" variant="danger" small onPress={onPurge} style={{ alignSelf: 'flex-start' }} />
      </Collapsible>
    </Screen>
  );
}
