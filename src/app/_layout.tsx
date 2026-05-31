import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db } from '@/db/database';
import { AutoSync } from '@/ui/AutoSync';
import { C } from '@/lib/theme';

export default function RootLayout() {
  // 起動時に一度だけ DB を初期化(スキーマ作成・初期データ投入)
  useState(() => {
    db();
    return true;
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AutoSync />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.bgTop },
            headerShadowVisible: false,
            headerTintColor: C.accentDeep,
            headerTitleStyle: { fontWeight: '800', color: C.text },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: C.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'ホーム' }} />
          <Stack.Screen name="rack" options={{ title: '棚ビュー' }} />
          <Stack.Screen name="analysis" options={{ title: '成績分析' }} />
          <Stack.Screen name="logs" options={{ title: 'アクティビティログ' }} />
          <Stack.Screen name="settings" options={{ title: '設定' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
