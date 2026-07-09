import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Clock } from './Clock';
import { R, S, F, shadow, HERO } from '../lib/theme';
import { WeatherVisual } from '../lib/weather';

export type HeroStyle = 'aurora' | 'tide' | 'editorial';
export const HERO_STYLES: HeroStyle[] = ['aurora', 'tide', 'editorial'];
export const HERO_LABEL: Record<HeroStyle, string> = {
  aurora: 'オーロラ',
  tide: 'タイド',
  editorial: 'エディトリアル',
};

interface WeatherState {
  vis: WeatherVisual;
  temp: number | null;
}

interface HeroProps {
  styleName: HeroStyle;
  greeting: string;
  sub: string;
  weather: WeatherState | null;
}

interface Palette {
  grad: [string, string, string];
  on: string;
  soft: string;
  blob: [string, string, string];
}

/** 季節の光パレット(lib/theme の SEASON に追従。春=桜霞/夏=水面/秋=琥珀/冬=雪明かり)。 */
function palette(): Palette {
  return {
    grad: HERO.grad,
    on: HERO.on,
    soft: HERO.soft,
    blob: HERO.blob,
  };
}

// ===== オーロラ: 暖色グラデ＋ゆっくり漂う光ブロブ＋ガラス =====
function AuroraBg({ pal }: { pal: Palette }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }), -1, true);
    b.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [a, b]);
  const s1 = useAnimatedStyle(() => ({
    transform: [{ translateX: a.value * 46 - 23 }, { translateY: a.value * 26 - 13 }, { scale: 1 + a.value * 0.12 }],
  }));
  const s2 = useAnimatedStyle(() => ({
    transform: [{ translateX: -b.value * 40 + 20 }, { translateY: b.value * 30 - 15 }, { scale: 1.1 - b.value * 0.1 }],
  }));
  const s3 = useAnimatedStyle(() => ({
    transform: [{ translateX: b.value * 30 - 15 }, { translateY: -a.value * 24 + 12 }],
  }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={pal.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[bg.blob, { backgroundColor: pal.blob[0], top: -50, left: -30, width: 220, height: 220 }, s1]} />
      <Animated.View style={[bg.blob, { backgroundColor: pal.blob[1], top: 10, right: -50, width: 200, height: 200 }, s2]} />
      <Animated.View style={[bg.blob, { backgroundColor: pal.blob[2], bottom: -60, left: 60, width: 180, height: 180 }, s3]} />
      <BlurView intensity={42} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ===== タイド: 斜めに流れる光の帯(Apple Music の没入アート風) =====
function TideBg({ pal }: { pal: Palette }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [t]);
  const band1 = useAnimatedStyle(() => ({ transform: [{ rotate: '-18deg' }, { translateX: t.value * 90 - 45 }] }));
  const band2 = useAnimatedStyle(() => ({ transform: [{ rotate: '-18deg' }, { translateX: -t.value * 80 + 40 }] }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[pal.grad[0], pal.grad[2]]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[bg.band, band1]}>
        <LinearGradient colors={['transparent', pal.blob[1], 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[bg.band, { top: 70 }, band2]}>
        <LinearGradient colors={['transparent', pal.blob[0], 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <BlurView intensity={26} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ===== エディトリアル: 静的・余白重視の下地(タイポは本体側で大きく) =====
function EditorialBg({ pal }: { pal: Palette }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[pal.grad[0], pal.grad[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

function WeatherInline({ pal, weather }: { pal: Palette; weather: WeatherState | null }) {
  if (!weather) return null;
  const t = weather.temp !== null ? `　${Math.round(weather.temp)}°` : '';
  return <Text style={[hs.chipText, { color: pal.soft }]}>{weather.vis.emoji} {weather.vis.label}{t}</Text>;
}

export function Hero({ styleName, greeting, sub, weather }: HeroProps) {
  const pal = palette();
  const Bg = styleName === 'tide' ? TideBg : styleName === 'editorial' ? EditorialBg : AuroraBg;
  const isEditorial = styleName === 'editorial';

  return (
    <View style={[shadow.float, { borderRadius: R.xxl }]}>
      <View style={hs.clip}>
        <Bg pal={pal} />

        {isEditorial ? (
          <View style={hs.edBody}>
            <Text style={[hs.edEyebrow, { color: pal.soft }]}>ZEBRAFISH LAB</Text>
            <Text style={[hs.edGreeting, { color: pal.on }]} numberOfLines={2}>{greeting}</Text>
            <View style={[hs.edRule, { backgroundColor: pal.soft }]} />
            <Text style={[hs.edSub, { color: pal.soft }]}>{sub}</Text>
            <View style={hs.row}>
              <Clock style={[hs.edClock, { color: pal.on }]} />
              <WeatherInline pal={pal} weather={weather} />
            </View>
          </View>
        ) : (
          <View style={hs.body}>
            <Text style={[hs.eyebrow, { color: pal.soft }]}>ZEBRAFISH LAB</Text>
            <Text style={[hs.greeting, { color: pal.on }]}>{greeting}</Text>
            <Text style={[hs.sub, { color: pal.soft }]}>{sub}</Text>
            <View style={hs.row}>
              <Clock style={[hs.clock, { color: pal.soft }]} />
              <View style={hs.chip}>
                <WeatherInline pal={pal} weather={weather} />
              </View>
            </View>
          </View>
        )}

      </View>
    </View>
  );
}

const bg = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.55 },
  band: { position: 'absolute', top: -10, left: -120, right: -120, height: 80 },
});

const hs = StyleSheet.create({
  clip: { borderRadius: R.xxl, overflow: 'hidden', minHeight: 168 },
  // 標準(オーロラ/タイド)
  body: { padding: S.five, gap: 4 },
  eyebrow: { fontSize: F.tiny, letterSpacing: 2.5, fontWeight: '800' },
  greeting: { fontSize: F.hero, fontWeight: '800', letterSpacing: -0.8 },
  sub: { fontSize: F.body, fontWeight: '600', marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.two, flexWrap: 'wrap', marginTop: 8 },
  clock: { fontSize: F.small, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipText: { fontSize: F.small, fontWeight: '700' },
  // エディトリアル
  edBody: { paddingHorizontal: S.five, paddingVertical: S.six, gap: 6 },
  edEyebrow: { fontSize: F.tiny, letterSpacing: 4, fontWeight: '800' },
  edGreeting: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, lineHeight: 44, marginTop: 4 },
  edRule: { height: 1, width: 56, opacity: 0.5, marginVertical: 8 },
  edSub: { fontSize: F.body, fontWeight: '600' },
  edClock: { fontSize: F.small, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { position: 'absolute', top: 10, right: 14, fontSize: 10, fontWeight: '700', opacity: 0.7, letterSpacing: 0.5 },
});
