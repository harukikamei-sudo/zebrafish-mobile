import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { C, S, R, F } from '../lib/theme';

export interface Column<T> {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

/** 横スクロール対応の簡易テーブル。行数が多い場合は親 ScrollView 側で縦スクロール。 */
export function Table<T extends Record<string, any>>({
  columns,
  rows,
  emptyText = 'データがありません',
}: {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
}) {
  if (!rows.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wrap}>
      <View>
        <View style={[styles.row, styles.headRow]}>
          {columns.map((c) => (
            <Text
              key={c.key}
              style={[
                styles.headCell,
                { width: c.width ?? 90, textAlign: c.align ?? 'left' },
              ]}
              numberOfLines={1}>
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
            {columns.map((c) => (
              <View key={c.key} style={{ width: c.width ?? 90 }}>
                {c.render ? (
                  <View style={{ alignItems: alignToFlex(c.align) }}>{c.render(row)}</View>
                ) : (
                  <Text
                    style={[styles.cell, { textAlign: c.align ?? 'left' }]}
                    numberOfLines={2}>
                    {fmt(row[c.key])}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function fmt(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function alignToFlex(a?: 'left' | 'right' | 'center'): 'flex-start' | 'flex-end' | 'center' {
  if (a === 'right') return 'flex-end';
  if (a === 'center') return 'center';
  return 'flex-start';
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: C.glassEdge,
    borderRadius: R.md,
    backgroundColor: C.glassFillStrong,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 8,
    alignItems: 'center',
  },
  headRow: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.md,
    borderTopRightRadius: R.md,
  },
  rowAlt: { backgroundColor: 'rgba(0,0,0,0.015)' },
  headCell: { fontSize: F.tiny, fontWeight: '700', color: C.textSoft },
  cell: { fontSize: F.small, color: C.text },
  empty: { paddingVertical: S.five, alignItems: 'center' },
  emptyText: { color: C.textMute, fontSize: F.small },
});
