import { View, Text, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';

import { Screen } from '@/ui/Screen';
import { LinkCard } from '@/ui/nav';
import { IconName } from '@/ui/Icon';
import { C, S, F } from '@/lib/theme';

interface Item {
  icon: IconName;
  title: string;
  desc: string;
  href: Href;
}

const ITEMS: Item[] = [
  { icon: 'grid-outline', title: '棚ビュー', desc: 'ラック×段×列のレイアウトを色で確認', href: '/rack' },
  { icon: 'stats-chart-outline', title: '成績分析', desc: '水槽・ペア別の成功率ランキング', href: '/analysis' },
  { icon: 'time-outline', title: 'アクティビティログ', desc: '操作履歴の絞り込み・書き出し', href: '/logs' },
  { icon: 'settings-outline', title: '設定', desc: '担当者名・ラック/段・データ同期', href: '/settings' },
];

export default function MoreScreen() {
  return (
    <Screen title="その他">
      <View style={{ gap: S.three }}>
        {ITEMS.map((it) => (
          <LinkCard
            key={it.title}
            icon={it.icon}
            title={it.title}
            subtitle={it.desc}
            onPress={() => router.navigate(it.href)}
          />
        ))}
      </View>
      <Text style={styles.credit}>Powered by Haruki Kamei · Kusayama Daichi</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  credit: {
    textAlign: 'center',
    color: C.textMute,
    fontSize: F.tiny,
    letterSpacing: 0.5,
    marginTop: S.four,
  },
});
