import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Select, SelectOption } from './inputs';
import { COLS } from '../lib/constants';
import { formatLocation } from '../lib/format';
import { S } from '../lib/theme';

export interface LocationValue {
  rack: string;
  tier: string;
  col: string; // "01".."15"
  tankId: string; // 全て揃ったときのみ非空
}

const colOptions: SelectOption[] = COLS.map((c) => ({
  label: String(c).padStart(2, '0'),
  value: String(c).padStart(2, '0'),
}));

/**
 * ラック・段・列の連動セレクタ。全て選ばれると tankId を組み立てて onChange で通知。
 * fixedRack を渡すとラックは固定し段・列のみ選ばせる。
 * 親から key を変えると選択状態をリセットできる。
 */
export function LocationPicker({
  racks,
  tiers,
  fixedRack,
  onChange,
}: {
  racks: string[];
  tiers: string[];
  fixedRack?: string;
  onChange: (loc: LocationValue) => void;
}) {
  const [rack, setRack] = useState(fixedRack ?? '');
  const [tier, setTier] = useState('');
  const [col, setCol] = useState('');

  useEffect(() => {
    const r = fixedRack ?? rack;
    const tankId = r && tier && col ? formatLocation(r, tier, parseInt(col, 10)) : '';
    onChange({ rack: r, tier, col, tankId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rack, tier, col, fixedRack]);

  return (
    <View style={styles.row}>
      {!fixedRack && (
        <View style={styles.cell}>
          <Select
            value={rack || null}
            options={racks.map((r) => ({ label: r, value: r }))}
            onSelect={setRack}
            placeholder="ラック"
            title="ラックを選択"
          />
        </View>
      )}
      <View style={styles.cellSmall}>
        <Select
          value={tier || null}
          options={tiers.map((t) => ({ label: `段${t}`, value: t }))}
          onSelect={setTier}
          placeholder="段"
          title="段を選択"
        />
      </View>
      <View style={styles.cellSmall}>
        <Select
          value={col || null}
          options={colOptions}
          onSelect={setCol}
          placeholder="列"
          title="列を選択"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.two },
  cell: { flex: 1.4 },
  cellSmall: { flex: 1 },
});
