import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/ui/Glass';
import { ShrimpIcon } from '@/ui/Icon';
import { C, R, shadow } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(on: IoniconName, off: IoniconName) {
  return function Icon({ focused, color }: { focused: boolean; color: string }) {
    return (
      <View style={[styles.icon, focused && styles.iconActive]}>
        <Ionicons name={focused ? on : off} size={21} color={color} />
      </View>
    );
  };
}

function shrimpTabIcon() {
  return function Icon({ focused, color }: { focused: boolean; color: string }) {
    return (
      <View style={[styles.icon, focused && styles.iconActive]}>
        <ShrimpIcon size={18} color={color} />
      </View>
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accentDeep,
        tabBarInactiveTintColor: C.textMute,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 8 },
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom,
          height: 62,
          borderRadius: R.xxl,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          paddingBottom: 0,
          ...shadow.float,
        },
        tabBarBackground: () => <GlassSurface radius={R.xxl} intensity={50} style={styles.barEdge} />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'ホーム', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="feeding" options={{ title: '餌やり', tabBarIcon: shrimpTabIcon() }} />
      <Tabs.Screen name="trials" options={{ title: '交配', tabBarIcon: tabIcon('heart', 'heart-outline') }} />
      <Tabs.Screen name="tanks" options={{ title: '水槽', tabBarIcon: tabIcon('water', 'water-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'その他', tabBarIcon: tabIcon('grid', 'grid-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barEdge: {
    borderWidth: 1,
    borderColor: C.glassEdge,
  },
  icon: {
    width: 40,
    height: 30,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: C.accentSoft,
  },
});
