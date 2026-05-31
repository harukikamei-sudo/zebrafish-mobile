import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { C, R, S, shadow } from '../lib/theme';

/** 磨りガラスのパネル。背景(GradientBackground)を屈折させて Liquid Glass 感を出す。 */
export function GlassCard({
  children,
  style,
  radius = R.xl,
  intensity = 32,
  strong = false,
  padded = true,
  floating = false,
  blur = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
  intensity?: number;
  strong?: boolean;
  padded?: boolean;
  floating?: boolean;
  blur?: boolean;
}) {
  return (
    <View style={[floating ? shadow.float : shadow.card, { borderRadius: radius }, style]}>
      <View style={[styles.clip, { borderRadius: radius }]}>
        {blur ? <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} /> : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: blur ? (strong ? C.glassFillStrong : C.glassFill) : C.glassFillStrong },
          ]}
        />
        {/* ガラスのフチ(上側ハイライト) */}
        <View
          pointerEvents="none"
          style={[styles.edge, { borderRadius: radius, borderColor: C.glassEdge }]}
        />
        <View style={padded ? styles.content : undefined}>{children}</View>
      </View>
    </View>
  );
}

/** タブバーなどの背面に敷く磨りガラス面 */
export function GlassSurface({
  radius = 0,
  intensity = 40,
  style,
}: {
  radius?: number;
  intensity?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.glassFillStrong }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  content: {
    padding: S.four,
    gap: S.three,
  },
});
