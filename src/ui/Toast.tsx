import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../state/store';
import { C, R, F, shadow } from '../lib/theme';

/** 画面下に数秒だけ出る通知。store の showToast() で表示する(全画面共通)。 */
export function ToastHost() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: toast ? 1 : 0,
      duration: toast ? 180 : 220,
      useNativeDriver: true,
    }).start();
  }, [toast, anim]);

  if (!toast) return null;
  const bg = toast.kind === 'error' ? C.danger : toast.kind === 'info' ? C.accentDeep : C.success;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 84,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: bg }]}>
        <Text style={styles.text}>{toast.msg}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  toast: {
    borderRadius: R.lg,
    paddingVertical: 11,
    paddingHorizontal: 18,
    maxWidth: '88%',
    ...shadow.float,
  },
  text: { color: C.onPrimary, fontSize: F.small, fontWeight: '700', textAlign: 'center' },
});
