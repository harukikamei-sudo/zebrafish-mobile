import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { C } from '../lib/theme';

/**
 * 画面全体の雰囲気背景。
 * 温かいアイボリーのグラデに、琥珀〜珊瑚の光ブロブを散らし、ガラスでソフトに溶かす。
 * 上に乗る BlurView パネルがこの背景を屈折させ、Liquid Glass 感を出す。
 */
export function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[C.bgTop, C.bg, C.bgBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, { backgroundColor: C.blobAmber, top: -70, right: -50, width: 320, height: 320 }]} />
      <View style={[styles.orb, { backgroundColor: C.blobGold, top: 150, left: -100, width: 280, height: 280 }]} />
      <View style={[styles.orb, { backgroundColor: C.blobPeach, top: 420, right: -80, width: 300, height: 300 }]} />
      <View style={[styles.orb, { backgroundColor: C.blobRose, bottom: -90, left: -50, width: 260, height: 260 }]} />
      <View style={[styles.orb, { backgroundColor: C.blobGold, bottom: 120, right: -110, width: 240, height: 240 }]} />
      {/* ガラスで光をソフトに溶かす */}
      <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
