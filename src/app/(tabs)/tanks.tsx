import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { Screen } from '@/ui/Screen';
import { Card, SectionLabel, Btn, Notice, Muted, Divider, H3 } from '@/ui/primitives';
import { Field, TextField, Select, NumberStepper } from '@/ui/inputs';
import { Collapsible } from '@/ui/Collapsible';
import { Table } from '@/ui/Table';
import { LocationPicker, LocationValue } from '@/ui/LocationPicker';
import { useReload } from '@/hooks/useReload';
import { bumpData, showToast } from '@/state/store';
import { listTanks, getTank, upsertTank, deleteTank, swapTanks, importTankRow, Tank } from '@/db/tanks';
import { loadRacks, loadTiers } from '@/db/settings';
import { logAction } from '@/db/logs';
import { formatLocation, fmtCounts } from '@/lib/format';
import { COLS, HEALTH_STATUSES, type HealthStatus } from '@/lib/constants';
import { toCsv, shareCsv, parseCsv, readTextFile } from '@/lib/csv';
import { C, S, F } from '@/lib/theme';

export default function TanksScreen() {
  const tick = useReload();
  const racks = useMemo(() => loadRacks(), [tick]);
  const tiers = useMemo(() => loadTiers(), [tick]);
  const tanks = useMemo(() => listTanks(), [tick]);

  // --- 登録フォーム ---
  const [loc, setLoc] = useState<LocationValue>({ rack: '', tier: '', col: '', tankId: '' });
  const [lineage, setLineage] = useState('');
  const [health, setHealth] = useState<HealthStatus>('良好');
  const [m, setM] = useState(0);
  const [f, setF] = useState(0);
  const [u, setU] = useState(0);
  const [memo, setMemo] = useState('');
  const [loadedFor, setLoadedFor] = useState<string>('');

  const existing = loc.tankId ? getTank(loc.tankId) : null;

  // 場所が確定して既存タンクならその値を読み込む(tankId 変化時に一度だけ)
  useEffect(() => {
    if (!loc.tankId || loc.tankId === loadedFor) return;
    setLoadedFor(loc.tankId);
    const ex = getTank(loc.tankId);
    if (ex) {
      setLineage(ex.lineage ?? '');
      setHealth((ex.health_status as HealthStatus) ?? '良好');
      setM(ex.male_count || 0);
      setF(ex.female_count || 0);
      setU(ex.unknown_count || 0);
      setMemo(ex.memo ?? '');
    } else {
      setLineage('');
      setHealth('良好');
      setM(0);
      setF(0);
      setU(0);
      setMemo('');
    }
  }, [loc.tankId, loadedFor]);

  const total = m + f + u;

  const onSubmit = () => {
    if (!loc.tankId) {
      Alert.alert('入力エラー', 'ラック・段・列をすべて選んでください（水槽IDが生成されません）');
      return;
    }
    upsertTank({
      tank_id: loc.tankId,
      rack: loc.rack,
      tier: loc.tier,
      col_no: parseInt(loc.col, 10),
      health_status: health,
      memo: memo.trim() || null,
      male_count: m,
      female_count: f,
      unknown_count: u,
      lineage: lineage.trim() || null,
    });
    logAction(
      '水槽登録/更新',
      loc.tankId,
      `♂${m} / ♀${f} / ?${u}` + (total > 0 ? ` / ${health}` : ' / 空'),
    );
    bumpData();
    showToast(`水槽 ${loc.tankId}（${total === 0 ? '空' : `${total}匹`}）を登録/更新しました`);
  };

  // --- フィルタ ---
  const [fRack, setFRack] = useState('all');
  const [fTier, setFTier] = useState('all');
  const [fHealth, setFHealth] = useState('all');

  const filtered = useMemo(() => {
    let v = tanks;
    if (fRack !== 'all') v = v.filter((t) => t.rack === fRack);
    if (fTier !== 'all') v = v.filter((t) => t.tier === fTier);
    if (fHealth !== 'all') v = v.filter((t) => t.health_status === fHealth);
    return v;
  }, [tanks, fRack, fTier, fHealth]);

  return (
    <Screen title="水槽管理" subtitle={`配置：${racks.length}ラック × ${tiers.length}段 × ${COLS.length}列`}>
      {/* 新規登録 / 更新 */}
      <Card>
        <H3>新規登録 / 内容更新</H3>
        <Field label="場所（ラック - 段 - 列）">
          <LocationPicker racks={racks} tiers={tiers} onChange={setLoc} />
        </Field>
        <View style={styles.idBox}>
          <Text style={styles.idLabel}>水槽ID（自動生成）</Text>
          <Text style={styles.idValue}>{loc.tankId || '（場所を選択）'}</Text>
          {existing ? <Text style={styles.idNote}>※ 既存IDのため上書きされます</Text> : null}
        </View>

        <Field label="系統名（例: AB, TU, WIK）">
          <TextField value={lineage} onChangeText={setLineage} placeholder="任意" autoCapitalize="characters" />
        </Field>

        <Field label="健康状態" hint="魚がいない（合計0匹）の場合は記録されません">
          <Select
            value={health}
            options={HEALTH_STATUSES.map((h) => ({ label: h, value: h }))}
            onSelect={(v) => setHealth(v as HealthStatus)}
          />
        </Field>

        <Field label="匹数（性別ごと）">
          <View style={styles.steppers}>
            <NumberStepper value={m} onChange={setM} label="♂ オス" style={{ flex: 1 }} />
            <NumberStepper value={f} onChange={setF} label="♀ メス" style={{ flex: 1 }} />
            <NumberStepper value={u} onChange={setU} label="？ 不明" style={{ flex: 1 }} />
          </View>
          <Text style={styles.totalText}>
            合計 <Text style={{ color: C.text, fontWeight: '700', fontSize: F.h3 }}>{total === 0 ? '空' : `${total} 匹`}</Text>
          </Text>
        </Field>

        <Field label="メモ">
          <TextField value={memo} onChangeText={setMemo} multiline placeholder="任意" />
        </Field>

        <Btn label="登録 / 更新" variant="primary" onPress={onSubmit} />
      </Card>

      {/* スワップ */}
      <SwapSection tanks={tanks} />

      {/* 登録済み一覧 */}
      <SectionLabel>登録済み水槽</SectionLabel>
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Select value={fRack} options={[{ label: '全ラック', value: 'all' }, ...racks.map((r) => ({ label: r, value: r }))]} onSelect={setFRack} />
        </View>
        <View style={{ flex: 1 }}>
          <Select value={fTier} options={[{ label: '全段', value: 'all' }, ...tiers.map((t) => ({ label: `段${t}`, value: t }))]} onSelect={setFTier} />
        </View>
        <View style={{ flex: 1 }}>
          <Select value={fHealth} options={[{ label: '全状態', value: 'all' }, ...HEALTH_STATUSES.map((h) => ({ label: h, value: h }))]} onSelect={setFHealth} />
        </View>
      </View>
      <Muted>表示中: {filtered.length} / 全 {tanks.length} 水槽</Muted>
      <Table
        columns={[
          { key: 'tank_id', label: '水槽ID', width: 100 },
          { key: 'counts', label: '匹数', width: 130 },
          { key: 'lineage', label: '系統', width: 60 },
          { key: 'health', label: '状態', width: 64 },
          { key: 'memo', label: 'メモ', width: 120 },
        ]}
        rows={filtered.map((t) => ({
          tank_id: t.tank_id,
          counts: fmtCounts(t.male_count, t.female_count, t.unknown_count, { withTotal: true }),
          lineage: t.lineage ?? '—',
          health: t.health_status ?? '—',
          memo: t.memo ?? '—',
        }))}
        emptyText="まだ水槽が登録されていません"
      />
      <Btn
        label="📥 CSVダウンロード"
        small
        disabled={tanks.length === 0}
        style={{ alignSelf: 'flex-start' }}
        onPress={() =>
          shareCsv(
            'tanks',
            toCsv(tanks, ['tank_id', 'rack', 'tier', 'col_no', 'male_count', 'female_count', 'unknown_count', 'lineage', 'health_status', 'set_date', 'memo']),
          )
        }
      />

      {/* CSV インポート */}
      <ImportSection racks={racks} tiers={tiers} />

      {/* 削除 */}
      <DeleteSection tanks={tanks} />
    </Screen>
  );
}

// ===== スワップ =====
function SwapSection({ tanks }: { tanks: Tank[] }) {
  const ids = tanks.map((t) => t.tank_id);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);

  const onSwap = () => {
    if (!a || !b || a === b) {
      Alert.alert('エラー', '違う水槽を2つ選んでください');
      return;
    }
    swapTanks(a, b);
    logAction('水槽スワップ', `${a} ↔ ${b}`);
    bumpData();
    showToast(`水槽 ${a} と ${b} の中身を入れ替えました`);
  };

  return (
    <Collapsible title="🔄 2水槽の中身をスワップする">
      <Muted>選んだ2水槽の中身（匹数・系統・健康状態・メモ）を入れ替えます。場所はそのままです。</Muted>
      {ids.length < 2 ? (
        <Notice kind="info">スワップには水槽が2つ以上必要です</Notice>
      ) : (
        <>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Select value={a} options={ids.map((i) => ({ label: i, value: i }))} onSelect={setA} placeholder="水槽 A" title="水槽 A" />
            </View>
            <View style={{ flex: 1 }}>
              <Select value={b} options={ids.map((i) => ({ label: i, value: i }))} onSelect={setB} placeholder="水槽 B" title="水槽 B" />
            </View>
          </View>
          <Btn label="🔄 スワップ実行" variant="primary" small onPress={onSwap} style={{ alignSelf: 'flex-start' }} />
        </>
      )}
    </Collapsible>
  );
}

// ===== CSV インポート =====
function ImportSection({ racks, tiers }: { racks: string[]; tiers: string[] }) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const sample = [
      { tank_id: `${racks[0]}-${tiers[0]}-01`, rack: racks[0], tier: tiers[0], col_no: 1, male_count: 5, female_count: 3, unknown_count: 0, lineage: 'AB', health_status: '良好', memo: '' },
      { tank_id: `${racks[0]}-${tiers[0]}-02`, rack: racks[0], tier: tiers[0], col_no: 2, male_count: 0, female_count: 0, unknown_count: 0, lineage: '', health_status: '', memo: '' },
    ];
    shareCsv('tank_template', toCsv(sample, ['tank_id', 'rack', 'tier', 'col_no', 'male_count', 'female_count', 'unknown_count', 'lineage', 'health_status', 'memo']));
  };

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await readTextFile(res.assets[0].uri);
      const parsed = parseCsv(text);
      const errs = validate(parsed, racks, tiers);
      setRows(parsed);
      setErrors(errs);
    } catch (e: any) {
      Alert.alert('読み込みエラー', String(e?.message ?? e));
    }
  };

  const doImport = () => {
    if (!rows) return;
    let ok = 0;
    let ng = 0;
    rows.forEach((r) => {
      try {
        const mc = int(r.male_count);
        const fc = int(r.female_count);
        const uc = int(r.unknown_count);
        importTankRow({
          tank_id: r.tank_id.trim(),
          rack: r.rack?.trim() || null,
          tier: r.tier?.trim() || null,
          col_no: r.col_no ? int(r.col_no) : null,
          health_status: (mc + fc + uc === 0 ? '良好' : (r.health_status?.trim() || '良好')) as HealthStatus,
          memo: r.memo?.trim() || null,
          male_count: mc,
          female_count: fc,
          unknown_count: uc,
          lineage: r.lineage?.trim() || null,
        });
        ok++;
      } catch {
        ng++;
      }
    });
    logAction('水槽登録/更新', 'CSV一括', `${ok}件取込` + (ng ? ` / 失敗${ng}` : ''));
    setRows(null);
    setErrors([]);
    bumpData();
    showToast(`🎉 ${ok} 件を登録/更新しました` + (ng ? `（失敗 ${ng} 件）` : ''));
  };

  return (
    <Collapsible title="📤 CSV 一括インポート">
      <Muted>同じ tank_id があれば上書き、無ければ新規登録されます。必須列：tank_id, rack, tier, col_no</Muted>
      <Btn label="📄 テンプレートCSVを書き出す" small onPress={downloadTemplate} style={{ alignSelf: 'flex-start' }} />
      <Btn label="📂 CSVファイルを選ぶ" small variant="primary" onPress={pick} style={{ alignSelf: 'flex-start' }} />
      {rows && (
        <>
          <Muted>{rows.length} 行を読み込みました</Muted>
          {errors.length > 0 ? (
            <>
              <Notice kind="error">❌ 検証エラー（{errors.length}件）</Notice>
              {errors.slice(0, 10).map((e, i) => (
                <Text key={i} style={styles.errLine}>・{e}</Text>
              ))}
            </>
          ) : (
            <>
              <Notice kind="success">✅ 検証OK：{rows.length} 行を登録/更新できます</Notice>
              <Btn label="⬆️ インポート実行" variant="primary" small onPress={doImport} style={{ alignSelf: 'flex-start' }} />
            </>
          )}
        </>
      )}
    </Collapsible>
  );
}

function validate(rows: Record<string, string>[], racks: string[], tiers: string[]): string[] {
  const errs: string[] = [];
  if (rows.length === 0) return ['データ行がありません'];
  const required = ['tank_id', 'rack', 'tier', 'col_no'];
  const missing = required.filter((c) => !(c in rows[0]));
  if (missing.length) return [`必須列が不足: ${missing.join(', ')}`];
  rows.forEach((r, i) => {
    const n = i + 2;
    if (!r.tank_id?.trim()) errs.push(`行${n}: tank_id が空`);
    if (r.rack?.trim() && !racks.includes(r.rack.trim())) errs.push(`行${n}: rack='${r.rack}' は無効`);
    if (r.tier?.trim() && !tiers.includes(r.tier.trim())) errs.push(`行${n}: tier='${r.tier}' は無効`);
    if (r.col_no?.trim()) {
      const c = parseInt(r.col_no, 10);
      if (Number.isNaN(c) || c < 1 || c > COLS.length) errs.push(`行${n}: col_no='${r.col_no}' は 1〜${COLS.length} の範囲外`);
    }
    if (r.health_status?.trim() && !['良好', '隔離中'].includes(r.health_status.trim()))
      errs.push(`行${n}: health_status='${r.health_status}' は [良好/隔離中]`);
  });
  return errs;
}

function int(v: string | undefined): number {
  const n = parseInt((v ?? '').trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

// ===== 削除 =====
function DeleteSection({ tanks }: { tanks: Tank[] }) {
  const [del, setDel] = useState<string | null>(null);
  const onDelete = () => {
    if (!del) return;
    Alert.alert('削除確認', `水槽 ${del} を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          deleteTank(del);
          logAction('水槽削除', del);
          showToast(`水槽 ${del} を削除しました`, 'info');
          setDel(null);
          bumpData();
        },
      },
    ]);
  };
  return (
    <Collapsible title="🗑️ 水槽を削除する">
      {tanks.length === 0 ? (
        <Notice kind="info">削除できる水槽がありません</Notice>
      ) : (
        <>
          <Select value={del} options={tanks.map((t) => ({ label: t.tank_id, value: t.tank_id }))} onSelect={setDel} placeholder="削除する水槽ID" title="削除する水槽" />
          <Btn label="削除" variant="danger" small disabled={!del} onPress={onDelete} style={{ alignSelf: 'flex-start' }} />
        </>
      )}
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  idBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  idLabel: { fontSize: F.tiny, color: C.textSoft },
  idValue: { fontSize: 18, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  idNote: { fontSize: F.tiny, color: C.accent, marginTop: 2 },
  steppers: { flexDirection: 'row', justifyContent: 'space-between', gap: S.two },
  totalText: { fontSize: F.small, color: C.textSoft, marginTop: S.two },
  filterRow: { flexDirection: 'row', gap: S.two },
  errLine: { fontSize: F.small, color: C.danger },
});
