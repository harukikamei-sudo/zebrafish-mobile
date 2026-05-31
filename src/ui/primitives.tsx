import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { C, S, R, F, shadow } from '../lib/theme';
import { GlassCard } from './Glass';
import { Icon, IconName } from './Icon';

// ===== カード(磨りガラス) =====
export function Card({
  children,
  style,
  floating,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  floating?: boolean;
}) {
  return (
    <GlassCard style={style} floating={floating}>
      {children}
    </GlassCard>
  );
}

// ===== セクションラベル(小さい大文字見出し) =====
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function H3({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.h3, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

// ===== メトリック(数値・ガラスタイル) =====
export function Metric({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <GlassCard style={{ flex: 1 }} radius={R.lg} padded={false} blur={false}>
      <View style={styles.metric}>
        <Text style={[styles.metricValue, { color: color ?? C.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
}

// ===== ボタン =====
type BtnVariant = 'primary' | 'default' | 'danger' | 'ghost';
export function Btn({
  label,
  onPress,
  variant = 'default',
  disabled,
  loading,
  style,
  small,
  icon,
  iconNode,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
  icon?: IconName;
  iconNode?: React.ReactNode;
}) {
  const fg = btnFg(variant);
  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : C.text} size="small" />
  ) : (
    <View style={styles.btnInner}>
      {iconNode ? iconNode : icon ? <Icon name={icon} size={small ? 15 : 17} color={fg} /> : null}
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.btnShadow,
          (disabled || loading) && styles.btnDisabled,
          pressed && styles.btnPressed,
          style,
        ]}>
        <LinearGradient
          colors={[C.accent, C.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, small && styles.btnSmall]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        VARIANT_BOX[variant],
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
        style,
      ]}>
      {content}
    </Pressable>
  );
}

function btnFg(v: BtnVariant): string {
  if (v === 'primary') return C.onPrimary;
  if (v === 'danger') return '#FFFFFF';
  if (v === 'ghost') return C.textSoft;
  return C.text;
}
const VARIANT_BOX: Record<BtnVariant, ViewStyle> = {
  primary: {},
  default: { backgroundColor: C.glassFillStrong, borderWidth: 1, borderColor: C.glassEdge },
  danger: { backgroundColor: C.danger },
  ghost: { backgroundColor: 'transparent' },
};

// ===== バッジ/ピル =====
export function Pill({ text, bg, fg }: { text: string; bg?: string; fg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? C.accentSoft }]}>
      <Text style={[styles.pillText, { color: fg ?? C.accentDeep }]}>{text}</Text>
    </View>
  );
}

// ===== プログレスバー =====
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color ?? C.accent }]} />
    </View>
  );
}

// ===== 通知ボックス =====
type NoticeKind = 'success' | 'error' | 'warn' | 'info';
const NOTICE: Record<NoticeKind, { bg: string; fg: string }> = {
  success: { bg: C.successSoft, fg: C.success },
  error: { bg: C.dangerSoft, fg: C.danger },
  warn: { bg: C.warnSoft, fg: C.warn },
  info: { bg: C.accentSoft, fg: C.accentDeep },
};
export function Notice({ kind, children }: { kind: NoticeKind; children: React.ReactNode }) {
  const c = NOTICE[kind];
  return (
    <View style={[styles.notice, { backgroundColor: c.bg }]}>
      <Text style={[styles.noticeText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={styles.kvV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: F.tiny,
    letterSpacing: 1.8,
    color: C.textMute,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: S.one,
    marginLeft: S.half,
  },
  h3: { fontSize: F.h3, fontWeight: '700', color: C.text },
  muted: { fontSize: F.small, color: C.textSoft, lineHeight: 19 },
  metric: { alignItems: 'center', gap: 3, paddingVertical: S.four, paddingHorizontal: S.two },
  metricValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  metricLabel: { fontSize: F.tiny, color: C.textSoft, textAlign: 'center' },
  btn: {
    borderRadius: R.pill,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 15, minHeight: 36 },
  btnShadow: { borderRadius: R.pill, ...shadow.soft },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnText: { fontSize: F.body, fontWeight: '700' },
  btnTextSmall: { fontSize: F.small, fontWeight: '600' },
  pill: { borderRadius: R.pill, paddingVertical: 4, paddingHorizontal: 11, alignSelf: 'flex-start' },
  pillText: { fontSize: F.small, fontWeight: '700' },
  progressTrack: {
    height: 9,
    borderRadius: R.pill,
    backgroundColor: 'rgba(42,31,23,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: R.pill },
  notice: { borderRadius: R.md, paddingVertical: 11, paddingHorizontal: 14 },
  noticeText: { fontSize: F.small, fontWeight: '600', lineHeight: 19 },
  divider: { height: 1, backgroundColor: C.hairline, marginVertical: S.one },
  empty: { paddingVertical: S.five, alignItems: 'center' },
  emptyText: { color: C.textMute, fontSize: F.small },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: S.three, paddingVertical: 3 },
  kvK: { color: C.textSoft, fontSize: F.small },
  kvV: { color: C.text, fontSize: F.small, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
