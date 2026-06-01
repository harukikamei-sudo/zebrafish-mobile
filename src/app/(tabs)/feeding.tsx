import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Screen } from '@/ui/Screen';
import { Card, SectionLabel, Metric, Btn, Notice, ProgressBar, H3, Muted, Divider } from '@/ui/primitives';
import { Field, TextField } from '@/ui/inputs';
import { ShrimpIcon } from '@/ui/Icon';
import { Collapsible } from '@/ui/Collapsible';
import { Table } from '@/ui/Table';
import { useReload } from '@/hooks/useReload';
import { bumpData, showToast } from '@/state/store';
import { addFeed, countToday, lastFedAt, todayLogs, allFeedingLogs, undoLastToday } from '@/db/feeding';
import { logAction } from '@/db/logs';
import { hoursSince, timeHm, timeHms, toJstWall } from '@/lib/time';
import { FEEDS_PER_DAY, FEED_WARN_HOURS, FEED_ALERT_HOURS } from '@/lib/constants';
import { toCsv, shareCsv } from '@/lib/csv';
import { C, S, R, F } from '@/lib/theme';

export default function FeedingScreen() {
  const tick = useReload();
  const [memo, setMemo] = useState('');

  const data = useMemo(() => {
    const count = countToday();
    const last = lastFedAt();
    return {
      count,
      last,
      hrs: hoursSince(last),
      today: todayLogs(),
      all: allFeedingLogs(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const done = data.count >= FEEDS_PER_DAY;
  const hrs = data.hrs;
  const progressColor = done
    ? C.success
    : (hrs ?? 0) >= FEED_ALERT_HOURS
      ? C.danger
      : (hrs ?? 0) >= FEED_WARN_HOURS
        ? C.warn
        : C.primary;

  const onFeed = () => {
    addFeed(memo.trim() || null);
    logAction('餌やり', null, memo.trim() || '全水槽給餌');
    setMemo('');
    bumpData();
    showToast('🦐 餌やりを記録しました');
  };

  const onUndo = () => {
    if (undoLastToday()) {
      bumpData();
      showToast('直近の餌やりを取り消しました', 'info');
    }
  };

  return (
    <Screen title="餌やりログ" subtitle={`目標：1日 ${FEEDS_PER_DAY} 回（全水槽に一斉に給餌）`}>
      {/* メイン状況 */}
      <Card>
        <View style={styles.row}>
          <View style={styles.bigIcon}>
            <ShrimpIcon size={34} color={C.accentDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel>本日の給餌</SectionLabel>
            <Text style={[styles.bigCount, { color: progressColor }]}>
              {data.count} / {FEEDS_PER_DAY} 回
            </Text>
            <Muted>
              前回給餌 <Text style={{ color: C.text, fontWeight: '700' }}>{timeHm(data.last)}</Text>
              {'　／　'}
              {hrs === null ? '未記録' : `前回から ${hrs.toFixed(1)} 時間`}
            </Muted>
            <View style={{ marginTop: S.two }}>
              <ProgressBar value={data.count / FEEDS_PER_DAY} color={progressColor} />
            </View>
          </View>
        </View>

        {done ? (
          <Notice kind="success">✅ 本日の目標 {FEEDS_PER_DAY} 回を達成しました！</Notice>
        ) : hrs !== null && hrs >= FEED_ALERT_HOURS ? (
          <Notice kind="error">⚠️ 前回給餌から {hrs.toFixed(1)} 時間経過しています</Notice>
        ) : hrs !== null && hrs >= FEED_WARN_HOURS ? (
          <Notice kind="warn">前回給餌から {hrs.toFixed(1)} 時間</Notice>
        ) : null}
      </Card>

      {/* 記録 */}
      <Card>
        <Field label="メモ（任意）">
          <TextField value={memo} onChangeText={setMemo} placeholder="例: 朝の分 / 担当者名 など" />
        </Field>
        <Btn
          label={done ? '追加で記録する' : '全水槽に餌をあげた'}
          iconNode={<ShrimpIcon size={17} color={C.onPrimary} />}
          variant="primary"
          onPress={onFeed}
        />
      </Card>

      {/* 本日のログ */}
      <View style={{ gap: S.two }}>
        <H3>本日の給餌ログ</H3>
        {data.today.length === 0 ? (
          <Notice kind="info">本日の記録はまだありません</Notice>
        ) : (
          <>
            <Table
              columns={[
                { key: 'time', label: '時刻', width: 88, render: (r: any) => <Text style={styles.cell}>{timeHms(r.fed_at)}</Text> },
                { key: 'memo', label: 'メモ', width: 200 },
              ]}
              rows={data.today.map((l) => ({ ...l, time: timeHms(l.fed_at), memo: l.memo ?? '—' }))}
            />
            <Btn label="⬅️ 直近の1件を取り消す" small onPress={onUndo} style={{ alignSelf: 'flex-start' }} />
          </>
        )}
      </View>

      {/* 過去ログ */}
      <Collapsible title="📜 過去の給餌ログ（全件）">
        <Table
          columns={[
            { key: 'fed_at', label: '日時', width: 150, render: (r: any) => <Text style={styles.cell}>{toJstWall(r.fed_at) ?? r.fed_at}</Text> },
            { key: 'memo', label: 'メモ', width: 200 },
          ]}
          rows={data.all.map((l) => ({ ...l, memo: l.memo ?? '—' }))}
          emptyText="記録がありません"
        />
        <Divider />
        <Btn
          label="📥 CSVダウンロード"
          small
          disabled={data.all.length === 0}
          onPress={() =>
            shareCsv('feeding_logs', toCsv(data.all, ['id', 'fed_at', 'memo'], ['id', 'fed_at', 'memo']))
          }
          style={{ alignSelf: 'flex-start' }}
        />
      </Collapsible>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.three },
  bigIcon: {
    width: 64,
    height: 64,
    borderRadius: R.lg,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCount: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginVertical: 2 },
  cell: { fontSize: F.small, color: C.text },
});
