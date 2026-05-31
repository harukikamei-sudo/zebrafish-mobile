import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { C, S, R, F } from '../lib/theme';
import { GlassCard } from './Glass';
import { Icon, IconName } from './Icon';

// ===== セクション見出し(右側にアクション) =====
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <Text style={styles.action}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ===== ナビタイル(アイコン+数値+ラベル、タップで遷移) =====
export function NavTile({
  icon,
  value,
  label,
  color,
  onPress,
}: {
  icon: IconName;
  value: React.ReactNode;
  label: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [{ flex: 1 }, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}>
      <GlassCard radius={R.lg} padded={false} blur={false} style={{ flex: 1 }}>
        <View style={styles.tile}>
          <Icon name={icon} size={20} color={color ?? C.accentDeep} />
          <Text style={[styles.tileValue, { color: color ?? C.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

// ===== リンクカード(アイコン+タイトル+説明、右にシェブロン) =====
export function LinkCard({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={onPress}>
      <GlassCard radius={R.lg} padded={false}>
        <View style={styles.linkCard}>
          <View style={[styles.linkIcon, iconColor ? { backgroundColor: withAlpha(iconColor) } : null]}>
            <Icon name={icon} size={21} color={iconColor ?? C.accentDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>{title}</Text>
            {subtitle ? <Text style={styles.linkSub}>{subtitle}</Text> : null}
          </View>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Icon name="chevron-forward" size={18} color={C.textMute} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

function withAlpha(_hex: string): string {
  // アイコン背景はアクセントの淡色で統一(色が指定されても淡いトーンに)
  return C.accentSoft;
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: S.two,
    paddingHorizontal: S.half,
  },
  sectionTitle: { fontSize: F.h3, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  action: { fontSize: F.small, color: C.accentDeep, fontWeight: '700' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
  tile: { alignItems: 'center', gap: 5, paddingVertical: S.four, paddingHorizontal: S.two },
  tileValue: { fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  tileLabel: { fontSize: F.tiny, color: C.textSoft, textAlign: 'center', fontWeight: '600' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: S.three, padding: S.four },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontSize: F.h3, fontWeight: '700', color: C.text },
  linkSub: { fontSize: F.small, color: C.textSoft, marginTop: 2 },
  badge: {
    backgroundColor: C.danger,
    borderRadius: R.pill,
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: F.tiny, fontWeight: '800' },
  chevron: { fontSize: 26, color: C.textMute, marginLeft: 2 },
});
