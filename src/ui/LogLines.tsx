import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { C, S, R, F } from '../lib/theme';
import { humanizeLog, LogRow } from '../lib/format';
import { toJstWall } from '../lib/time';

export interface LogLineItem extends LogRow {
  occurred_at: string;
}

/** アクティビティログを自然文の行リストで表示(温かい半透明パネル) */
export function LogLines({ rows, bare = false }: { rows: LogLineItem[]; bare?: boolean }) {
  if (!rows.length) {
    return <Text style={styles.empty}>ログがまだありません</Text>;
  }
  return (
    <View style={bare ? undefined : styles.box}>
      {rows.map((r, i) => (
        <View key={i} style={[styles.line, i < rows.length - 1 && styles.lineBorder]}>
          <View style={styles.dot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.msg}>{humanizeLog(r)}</Text>
            <Text style={styles.ts}>{toJstWall(r.occurred_at) ?? r.occurred_at}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: C.glassFillStrong,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.glassEdge,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', gap: 10, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'flex-start' },
  lineBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 6 },
  msg: { fontSize: F.small, color: C.text, lineHeight: 19, fontWeight: '500' },
  ts: { fontSize: F.tiny, color: C.textMute, marginTop: 1, fontVariant: ['tabular-nums'] },
  empty: { color: C.textMute, fontSize: F.small, paddingVertical: S.three },
});
