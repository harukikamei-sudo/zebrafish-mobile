/**
 * デザイントークン ― "Warm Liquid Glass"。
 * 温かいアイボリーの地に、琥珀〜珊瑚のやわらかな光(サンライズ)を散らし、
 * その上に磨りガラス(BlurView)のパネルを浮かべる。角丸大きめ・余白広め・極細のガラスエッジ。
 */

export const C = {
  // インク(温かみのある黒に近い茶)
  text: '#2A1F17',
  textSoft: '#7A6A5C',
  textMute: '#B4A595',

  // 背景(温かいアイボリー)。実際のグラデ/光のブロブは GradientBackground 側。
  bg: '#F6EFE6',
  bgTop: '#FCF7EF',
  bgBottom: '#F1E7D9',

  // ガラス面
  glassFill: 'rgba(255,252,246,0.56)', // 温白の白かぶせ
  glassFillStrong: 'rgba(255,252,246,0.74)',
  glassEdge: 'rgba(255,255,255,0.8)', // 上側ハイライト境界
  glassEdgeSoft: 'rgba(255,255,255,0.45)',
  hairline: 'rgba(42,31,23,0.07)',

  // 単色面(フォーム/テーブルなど可読性優先)
  card: '#FFFDFA',
  surface: '#F4EDE3',
  border: '#E9DECF',
  borderSoft: '#F0E8DC',

  // プライマリ(濃い温インク)
  primary: '#2A1C12',
  onPrimary: '#FFF8EF',

  // アクセント(琥珀テラコッタ)
  accent: '#E08A45',
  accentDeep: '#C56A2C',
  accentSoft: 'rgba(224,138,69,0.14)',
  coral: '#E8765A',

  // セマンティック(温色寄り)
  danger: '#D85A45',
  dangerSoft: 'rgba(216,90,69,0.13)',
  warn: '#C98A2B',
  warnSoft: 'rgba(201,138,43,0.15)',
  success: '#5C9A5A',
  successSoft: 'rgba(92,154,90,0.16)',
  info: '#C08A4A',
  infoSoft: 'rgba(192,138,74,0.13)',

  // 健康状態(棚ビュー)
  good: '#CBE2A8',
  isolated: '#F2BBA6',
  empty: 'rgba(255,255,255,0.5)',

  // 背景の光ブロブ(ガラスが屈折する暖色光)
  blobAmber: 'rgba(255,193,120,0.40)',
  blobPeach: 'rgba(255,168,140,0.34)',
  blobGold: 'rgba(255,214,150,0.36)',
  blobRose: 'rgba(255,150,135,0.24)',
} as const;

export const S = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const R = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const F = {
  hero: 30,
  h1: 27,
  h2: 22,
  h3: 17,
  h4: 14,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const shadow = {
  card: {
    shadowColor: '#5A3210',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#5A3210',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: '#5A3210',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const;
