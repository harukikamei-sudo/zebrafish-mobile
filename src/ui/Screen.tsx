import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBackground } from './GradientBackground';
import { C, S, F } from '../lib/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** 共通スクリーン枠。温かいガラス背景・セーフエリア・浮遊タブバー分の余白を提供。 */
export function Screen({ title, subtitle, children, scroll = true, onRefresh, refreshing }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const header = title ? (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <GradientBackground />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + S.three }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />
            ) : undefined
          }>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { paddingTop: insets.top + S.three, flex: 1 }]}>
          {header}
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: S.four,
    paddingBottom: 150,
    gap: S.four,
  },
  header: {
    gap: 3,
    marginBottom: S.one,
    paddingHorizontal: S.half,
  },
  title: {
    fontSize: F.h1,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: F.small,
    color: C.textSoft,
    lineHeight: 19,
  },
});
