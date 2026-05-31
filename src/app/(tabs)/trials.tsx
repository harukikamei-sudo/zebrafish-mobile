import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import { Screen } from '@/ui/Screen';
import { Card, SectionLabel, Btn, Notice, Muted, Divider, H3, Pill, KV } from '@/ui/primitives';
import { Field, TextField, Select, NumberStepper, SelectOption } from '@/ui/inputs';
import { Collapsible } from '@/ui/Collapsible';
import { Table } from '@/ui/Table';
import { LineChart } from '@/ui/LineChart';
import { useReload } from '@/hooks/useReload';
import { bumpData } from '@/state/store';
import { listTanks } from '@/db/tanks';
import { loadRacks } from '@/db/settings';
import { fertilizationSeries } from '@/db/spawning';
import {
  createTrial,
  activeTrials,
  doneTrials,
  markSetup,
  markDividerRemoved,
  markReturned,
  cancelTrial,
  collectEggs,
  Trial,
} from '@/db/trials';
import { logAction } from '@/db/logs';
import { fmtCounts } from '@/lib/format';
import { addDays, todayJst } from '@/lib/time';
import { TRIAL_BADGE } from '@/lib/constants';
import { toCsv, shareCsv } from '@/lib/csv';
import { C, S, F } from '@/lib/theme';

interface PairInput {
  srcM: string | null;
  srcF: string | null;
  breed: string | null;
  mtag: string;
  ftag: string;
}

const emptyPair = (): PairInput => ({ srcM: null, srcF: null, breed: null, mtag: '', ftag: '' });

export default function TrialsScreen() {
  const tick = useReload();
  const racks = useMemo(() => loadRacks(), [tick]);
  const tanks = useMemo(() => listTanks(), [tick]);
  const active = useMemo(() => activeTrials(), [tick]);
  const done = useMemo(() => doneTrials(), [tick]);
  const series = useMemo(() => fertilizationSeries(), [tick]);

  // --- 新規計画 ---
  const [rack, setRack] = useState<string>(racks[0] ?? '');
  const [pairs, setPairs] = useState<PairInput[]>([emptyPair()]);
  const [planned, setPlanned] = useState(addDays(todayJst(), 1));
  const [notes, setNotes] = useState('');

  const inRack = (id: string) => id.startsWith(`${rack}-`);
  const optLabel = (t: (typeof tanks)[number]) => {
    const c = fmtCounts(t.male_count, t.female_count, t.unknown_count);
    return `${t.tank_id}  (${c})${t.lineage ? ` ・${t.lineage}` : ''}`;
  };
  const maleOpts: SelectOption[] = tanks
    .filter((t) => inRack(t.tank_id) && ((t.male_count || 0) > 0 || (t.unknown_count || 0) > 0))
    .map((t) => ({ label: optLabel(t), value: t.tank_id }));
  const femaleOpts: SelectOption[] = tanks
    .filter((t) => inRack(t.tank_id) && ((t.female_count || 0) > 0 || (t.unknown_count || 0) > 0))
    .map((t) => ({ label: optLabel(t), value: t.tank_id }));
  const emptyOpts: SelectOption[] = tanks
    .filter((t) => inRack(t.tank_id) && (t.male_count || 0) + (t.female_count || 0) + (t.unknown_count || 0) === 0)
    .map((t) => ({ label: t.tank_id, value: t.tank_id }));

  const setPair = (i: number, patch: Partial<PairInput>) =>
    setPairs((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const onRackChange = (r: string) => {
    setRack(r);
    setPairs([emptyPair()]);
  };

  const onBulkSubmit = () => {
    const valid = pairs.filter((p) => p.srcM && p.srcF);
    if (valid.length === 0) {
      Alert.alert('エラー', '有効なペアがありません。♂ と ♀ の元水槽を両方選んでください。');
      return;
    }
    const nos: number[] = [];
    valid.forEach((p) => {
      const no = createTrial({
        planned_date: planned,
        source_tank_male: p.srcM,
        source_tank_female: p.srcF,
        breeding_tank_id: p.breed,
        notes: notes.trim() || null,
        male_tag: p.mtag.trim() || null,
        female_tag: p.ftag.trim() || null,
      });
      nos.push(no);
      logAction('トライアル計画', `#${no}`, `♂${p.srcM} × ♀${p.srcF}${p.breed ? ` / 交配槽${p.breed}` : ''} / 予定${planned}`);
    });
    Alert.alert('完了', `🎉 ${nos.length} 件のトライアルを登録しました（#${nos.join(', #')}）`);
    setPairs([emptyPair()]);
    setNotes('');
    bumpData();
  };

  return (
    <Screen title="交配トライアル" subtitle="元水槽・交配用水槽を指定して交配を計画します。">
      {/* 新規計画 */}
      <Collapsible title="➕ 新規トライアルを計画する（一括登録対応）">
        <Field label="① 対象ラック" hint="同ラック内でペアを組む前提です">
          <Select value={rack} options={racks.map((r) => ({ label: r, value: r }))} onSelect={onRackChange} />
        </Field>
        <Muted>
          ラック {rack} に ♂候補 {maleOpts.length} / ♀候補 {femaleOpts.length} / 空槽 {emptyOpts.length} 件
        </Muted>

        <SectionLabel>② ペアを選択</SectionLabel>
        {pairs.map((p, i) => (
          <Card key={i} style={{ gap: S.two, backgroundColor: '#FBFBFD' }}>
            <Text style={styles.pairTitle}>▸ ペア {i + 1}</Text>
            <Field label="♂ オス側の元水槽（戻し先）">
              <Select value={p.srcM} options={maleOpts} onSelect={(v) => setPair(i, { srcM: v })} placeholder="選択" title="♂ 元水槽" />
            </Field>
            <Field label="♀ メス側の元水槽（戻し先）">
              <Select value={p.srcF} options={femaleOpts} onSelect={(v) => setPair(i, { srcF: v })} placeholder="選択" title="♀ 元水槽" />
            </Field>
            <Field label="交配槽（空のみ・任意）">
              <Select value={p.breed} options={emptyOpts} onSelect={(v) => setPair(i, { breed: v })} placeholder="選択（任意）" title="交配槽" />
            </Field>
            <View style={styles.tagRow}>
              <Field label="♂ タグ（任意）" style={{ flex: 1 }}>
                <TextField value={p.mtag} onChangeText={(t) => setPair(i, { mtag: t })} placeholder="例: M-01" />
              </Field>
              <Field label="♀ タグ（任意）" style={{ flex: 1 }}>
                <TextField value={p.ftag} onChangeText={(t) => setPair(i, { ftag: t })} placeholder="例: F-01" />
              </Field>
            </View>
          </Card>
        ))}
        <View style={styles.pairBtns}>
          <Btn label="➕ ペアを追加" small style={{ flex: 1 }} onPress={() => setPairs((ps) => [...ps, emptyPair()])} />
          {pairs.length > 1 && (
            <Btn label="➖ 最後を削除" small style={{ flex: 1 }} onPress={() => setPairs((ps) => ps.slice(0, -1))} />
          )}
        </View>

        <SectionLabel>③ 共通設定</SectionLabel>
        <Field label="採卵予定日（全ペア共通・YYYY-MM-DD）">
          <TextField value={planned} onChangeText={setPlanned} keyboardType="numeric" />
        </Field>
        <Field label="メモ（全ペア共通・任意）">
          <TextField value={notes} onChangeText={setNotes} />
        </Field>
        <Btn label="📝 計画を一括登録" variant="primary" onPress={onBulkSubmit} />
      </Collapsible>

      {/* 進行中 */}
      <SectionLabel>🔄 進行中のトライアル</SectionLabel>
      {active.length === 0 ? (
        <Notice kind="info">進行中のトライアルはありません</Notice>
      ) : (
        active.map((t) => <ActiveTrialCard key={t.id} trial={t} />)
      )}

      {/* 完了・中止 */}
      <SectionLabel>📚 完了・中止トライアル（採卵結果込み）</SectionLabel>
      <Table
        columns={[
          { key: 'no', label: '#', width: 40 },
          { key: 'planned_date', label: '予定日', width: 92 },
          { key: 'status', label: '状態', width: 64 },
          { key: 'sm', label: '♂水槽', width: 96 },
          { key: 'sf', label: '♀水槽', width: 96 },
          { key: 'eggs', label: '採卵数', width: 56, align: 'right' },
          { key: 'rate', label: '受精率%', width: 60, align: 'right' },
        ]}
        rows={done.map((t) => ({
          no: t.trial_no ?? '—',
          planned_date: t.planned_date,
          status: t.status,
          sm: t.source_tank_male ?? '—',
          sf: t.source_tank_female ?? '—',
          eggs: t.egg_count ?? '—',
          rate: t.fertilization_rate ?? '—',
        }))}
        emptyText="完了・中止のトライアルはありません"
      />
      {done.length > 0 && (
        <Btn
          label="📥 CSVダウンロード"
          small
          style={{ alignSelf: 'flex-start' }}
          onPress={() =>
            shareCsv(
              'mating_trials_done',
              toCsv(done, ['trial_no', 'planned_date', 'status', 'source_tank_male', 'source_tank_female', 'breeding_tank_id', 'egg_count', 'fertilization_rate', 'male_tag', 'female_tag', 'notes']),
            )
          }
        />
      )}

      {/* 受精率推移 */}
      {series.length > 0 && (
        <>
          <SectionLabel>📈 受精率の推移</SectionLabel>
          <Card>
            <LineChart
              data={series.map((s) => ({ label: s.spawning_date.slice(5), value: s.fertilization_rate }))}
              unit="%"
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

// ===== 進行中トライアルのカード =====
function ActiveTrialCard({ trial: t }: { trial: Trial }) {
  const [collecting, setCollecting] = useState(false);
  const [eggs, setEggs] = useState(0);
  const [rate, setRate] = useState('');

  const mShow = t.male_id || t.male_tag || '—';
  const fShow = t.female_id || t.female_tag || '—';

  const onCollect = () => {
    const r = parseFloat(rate);
    const rateVal = Number.isNaN(r) ? 0 : Math.max(0, Math.min(100, r));
    collectEggs(t, eggs, rateVal);
    logAction('採卵', `#${t.trial_no}`, `卵 ${eggs} 個 / 受精率 ${rateVal}%`);
    setCollecting(false);
    bumpData();
  };

  const confirmCancel = () => {
    Alert.alert('中止確認', `トライアル #${t.trial_no} を中止しますか？`, [
      { text: 'やめる', style: 'cancel' },
      {
        text: '中止する',
        style: 'destructive',
        onPress: () => {
          cancelTrial(t.id);
          logAction('トライアル中止', `#${t.trial_no}`);
          bumpData();
        },
      },
    ]);
  };

  return (
    <Card>
      <View style={styles.trialHead}>
        <Text style={styles.trialTitle}>
          {TRIAL_BADGE[t.status] ?? '⬜'} Trial #{t.trial_no}
        </Text>
        <Pill text={t.status} bg={C.borderSoft} fg={C.textSoft} />
      </View>
      <KV k="予定日" v={t.planned_date} />
      <KV k="♂ × ♀" v={`${mShow} × ${fShow}`} />
      <KV k="交配用水槽" v={t.breeding_tank_id ?? '—'} />
      <KV k="戻し先" v={`♂${t.source_tank_male ?? '-'} / ♀${t.source_tank_female ?? '-'}`} />

      <Divider />

      {t.status === '計画中' && (
        <Btn
          label="✅ 前日セット完了にする"
          variant="primary"
          small
          onPress={() => {
            markSetup(t.id);
            logAction('トライアル前日セット', `#${t.trial_no}`);
            bumpData();
          }}
        />
      )}

      {t.status === '前日セット済み' && (
        <View style={{ gap: S.two }}>
          <Btn
            label={t.divider_removed_at ? '🔓 仕切り取り出し済み' : '🔓 仕切り取り出し（交配開始）'}
            small
            disabled={!!t.divider_removed_at}
            onPress={() => {
              markDividerRemoved(t.id);
              logAction('仕切り取り出し', `#${t.trial_no}`);
              bumpData();
            }}
          />
          {!collecting ? (
            <Btn label="🥚 採卵完了 → 結果入力" variant="primary" small onPress={() => setCollecting(true)} />
          ) : (
            <Card style={{ backgroundColor: '#FBFBFD' }}>
              <H3>採卵結果を入力</H3>
              <Field label="採卵数">
                <NumberStepper value={eggs} onChange={setEggs} max={99999} />
              </Field>
              <Field label="受精率(%)">
                <TextField value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0〜100" />
              </Field>
              <View style={{ flexDirection: 'row', gap: S.two }}>
                <Btn label="登録" variant="primary" small style={{ flex: 1 }} onPress={onCollect} />
                <Btn label="キャンセル" variant="ghost" small style={{ flex: 1 }} onPress={() => setCollecting(false)} />
              </View>
            </Card>
          )}
        </View>
      )}

      {t.status === '採卵済み' && (
        <Btn
          label="🏠 戻し完了にする"
          variant="primary"
          small
          onPress={() => {
            markReturned(t.id);
            logAction('トライアル戻し完了', `#${t.trial_no}`);
            bumpData();
          }}
        />
      )}

      <Collapsible title="⛔ このトライアルを中止">
        <Btn label="中止する" variant="danger" small onPress={confirmCancel} style={{ alignSelf: 'flex-start' }} />
      </Collapsible>
    </Card>
  );
}

const styles = StyleSheet.create({
  pairTitle: { fontSize: F.body, fontWeight: '700', color: C.text },
  tagRow: { flexDirection: 'row', gap: S.two },
  pairBtns: { flexDirection: 'row', gap: S.two },
  trialHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trialTitle: { fontSize: F.h3, fontWeight: '700', color: C.text },
});
