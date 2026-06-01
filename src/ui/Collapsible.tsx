import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';

import { C, S, R, F } from '../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** タップで開閉するセクション(元アプリの st.expander 相当) */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** 制御したい場合に渡す(省略時は内部 state で開閉) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onOpenChange) onOpenChange(!open);
    else setOpenState((o) => !o);
  };
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={toggle}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.glassFillStrong,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.glassEdge,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: S.three,
  },
  title: { fontSize: F.body, fontWeight: '600', color: C.text, flex: 1 },
  chevron: { fontSize: 13, color: C.textSoft },
  body: { paddingHorizontal: S.three, paddingBottom: S.three, gap: S.three },
});
