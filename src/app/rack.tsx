import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';

import { Screen } from '@/ui/Screen';
import { SectionLabel, Metric, Notice, Muted } from '@/ui/primitives';
import { useReload } from '@/hooks/useReload';
import { listTanks, Tank } from '@/db/tanks';
import { loadRacks, loadTiers } from '@/db/settings';
import { COLS, EMPTY_COLOR, SEX_COLOR, SEX_COLOR_SOFT, SexKey } from '@/lib/constants';
import { fmtCounts } from '@/lib/format';
import { C, S, R, F } from '@/lib/theme';

const CELL = 38;

export default function RackScreen() {
  const tick = useReload();
  const { tanks, racks, tiers } = useMemo(
    () => ({ tanks: listTanks(), racks: loadRacks(), tiers: loadTiers() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const byLoc = useMemo(() => {
    const m = new Map<string, Tank>();
    tanks.forEach((t) => {
      if (t.tier != null && t.col_no != null) m.set(`${t.rack}|${t.tier}|${t.col_no}`, t);
    });
    return m;
  }, [tanks]);

  const totalMale = tanks.reduce((s, t) => s + (t.male_count || 0), 0);
  const totalFemale = tanks.reduce((s, t) => s + (t.female_count || 0), 0);
  const totalUnknown = tanks.reduce((s, t) => s + (t.unknown_count || 0), 0);

  const showTank = (t: Tank) => {
    Alert.alert(
      t.tank_id,
      `状態: ${t.health_status ?? '空'}\n匹数: ${fmtCounts(t.male_count, t.female_count, t.unknown_count)}\n系統: ${t.lineage ?? '—'}\nメモ: ${t.memo ?? '—'}`,
    );
  };

  return (
    <Screen>
      <Muted>
        {racks.length} ラック × {tiers.length} 段 × {COLS.length} 列 ＝ 最大{' '}
        {racks.length * tiers.length * COLS.length} 水槽。色は性別構成(♂ / ♀ / ？)を示します。
      </Muted>

      {/* 凡例 */}
      <View style={styles.legend}>
        <Legend color={SEX_COLOR.male} label="♂ オス" />
        <Legend color={SEX_COLOR.female} label="♀ メス" />
        <Legend color={SEX_COLOR.unknown} label="？ 不明" />
        <Legend color={EMPTY_COLOR} label="空 / 未登録" />
      </View>

      <View style={styles.metricsRow}>
        <Metric label="登録済み" value={tanks.length} />
        <Metric label="♂ オス" value={totalMale} color={SEX_COLOR.male} />
        <Metric label="♀ メス" value={totalFemale} color={SEX_COLOR.female} />
        <Metric label="？ 不明" value={totalUnknown} color={C.textSoft} />
      </View>

      {tanks.length === 0 ? (
        <Notice kind="info">
          水槽がまだ登録されていません。「水槽」タブから登録するか、CSV一括インポートを使ってください。
        </Notice>
      ) : (
        racks.map((rack) => (
          <View key={rack} style={{ gap: S.two }}>
            <SectionLabel>🏠 ラック {rack}</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* ヘッダ行(列番号) */}
                <View style={styles.gridRow}>
                  <View style={styles.tierLabel} />
                  {COLS.map((c) => (
                    <Text key={c} style={styles.colLabel}>
                      {String(c).padStart(2, '0')}
                    </Text>
                  ))}
                </View>
                {/* 段ごとの行 */}
                {tiers.map((tier) => (
                  <View key={tier} style={styles.gridRow}>
                    <Text style={styles.tierLabel}>段{tier}</Text>
                    {COLS.map((c) => {
                      const t = byLoc.get(`${rack}|${tier}|${c}`);
                      const m = t?.male_count || 0;
                      const f = t?.female_count || 0;
                      const u = t?.unknown_count || 0;
                      const total = m + f + u;
                      const dominant = dominantSex(m, f, u);
                      const bg = !t || total === 0 ? EMPTY_COLOR : SEX_COLOR_SOFT[dominant];
                      return (
                        <Pressable
                          key={c}
                          style={[styles.cell, { backgroundColor: bg }]}
                          disabled={!t}
                          onPress={() => t && showTank(t)}>
                          <Text style={styles.cellText}>{!t ? '—' : total === 0 ? '·' : total}</Text>
                          {total > 0 && (
                            <View style={styles.sexBar}>
                              {m > 0 && <View style={{ flex: m, backgroundColor: SEX_COLOR.male }} />}
                              {f > 0 && <View style={{ flex: f, backgroundColor: SEX_COLOR.female }} />}
                              {u > 0 && (
                                <View style={{ flex: u, backgroundColor: SEX_COLOR.unknown }} />
                              )}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ))
      )}
    </Screen>
  );
}

/** 最も多い性別を返す(同数や全0のときは不明扱い)。セルの地色に使う。 */
function dominantSex(m: number, f: number, u: number): SexKey {
  if (m > f && m > u) return 'male';
  if (f > m && f > u) return 'female';
  return 'unknown';
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: S.three, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 4 },
  legendText: { fontSize: F.small, color: C.textSoft },
  metricsRow: { flexDirection: 'row', gap: S.one },
  gridRow: { flexDirection: 'row', gap: 3, marginBottom: 3, alignItems: 'center' },
  tierLabel: { width: 36, fontSize: F.tiny, color: C.textSoft, textAlign: 'right', paddingRight: 4 },
  colLabel: { width: CELL, textAlign: 'center', fontSize: 9, color: C.textMute },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellText: { fontSize: F.tiny, color: '#3C3530', fontWeight: '600' },
  sexBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    flexDirection: 'row',
  },
});
