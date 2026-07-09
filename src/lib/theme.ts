/**
 * デザイントークン ― "Seasonal Liquid Glass"。
 * やわらかな地に光を散らし、磨りガラス(BlurView)のパネルを浮かべる構造は年間共通。
 * 季節で変えるのは「光」だけ ― 背景の地色・光のブロブ・アクセント・ヒーローの空。
 * インク(文字色)・ガラス・余白・角丸・セマンティック色(危険/警告/成功)は季節で変えない。
 *  春「桜霞」/ 夏「水面」/ 秋「琥珀」(従来の Warm Liquid Glass) / 冬「雪明かり」
 */
import { todayJst } from './time';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** JST の月で判定: 3〜5月 春 / 6〜8月 夏 / 9〜11月 秋 / 12〜2月 冬 */
export function currentSeason(): Season {
  const m = parseInt(todayJst().slice(5, 7), 10);
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** 起動時に一度だけ判定する(使用中に突然色が変わらないように)。 */
export const SEASON: Season = currentSeason();

/** 季節ごとの「光」。構造(ガラス・インク・余白)はこの外にあり、季節では変えない。 */
interface SeasonLight {
  /** 背景グラデ(上・中・下) */
  bgTop: string;
  bg: string;
  bgBottom: string;
  /** 単色面(フォーム/テーブル)の紙色も地の色温度に合わせる */
  card: string;
  surface: string;
  border: string;
  borderSoft: string;
  /** 背景に漂う光のブロブ(GradientBackground の4灯) */
  blobA: string;
  blobB: string;
  blobC: string;
  blobD: string;
  /** アクセント(リンク・活性タブ・進捗・グラフ・infoの通知) */
  accent: string;
  accentDeep: string;
  accentSoft: string;
  /** ヒーロー(ホーム上部)の空 */
  heroGrad: [string, string, string];
  heroOn: string;
  heroSoft: string;
  heroBlob: [string, string, string];
  /** 影のインク(地の色温度に合わせる) */
  shadowInk: string;
}

const SEASONS: Record<Season, SeasonLight> = {
  // 春「桜霞」― 桜と白桜のかすみに藤を一滴。アクセントは深いローズ。
  spring: {
    bgTop: '#FDF8F9',
    bg: '#FAF1F3',
    bgBottom: '#F5E9ED',
    card: '#FFFDFD',
    surface: '#F7EDF0',
    border: '#ECDCE2',
    borderSoft: '#F3E7EB',
    blobA: 'rgba(244,166,190,0.36)', // 桜
    blobB: 'rgba(252,214,222,0.40)', // 白桜
    blobC: 'rgba(238,140,165,0.28)', // 薄紅
    blobD: 'rgba(196,170,220,0.22)', // 藤
    accent: '#D9718F',
    accentDeep: '#B04A6C',
    accentSoft: 'rgba(217,113,143,0.15)',
    heroGrad: ['#FBE3E9', '#F4BFCE', '#E9A3B8'],
    heroOn: '#47202D',
    heroSoft: 'rgba(71,32,45,0.70)',
    heroBlob: ['#FFF0F4', '#F8C6D3', '#EFB0C9'],
    shadowInk: '#5A2233',
  },
  // 夏「水面」― 空から水へ。アクセントはマリンブルー。
  summer: {
    bgTop: '#F6FAFD',
    bg: '#EFF6FA',
    bgBottom: '#E6F0F6',
    card: '#FCFEFF',
    surface: '#EDF3F8',
    border: '#DCE7EF',
    borderSoft: '#E8F0F5',
    blobA: 'rgba(120,180,230,0.34)', // 空
    blobB: 'rgba(190,225,245,0.40)', // 白波
    blobC: 'rgba(100,200,215,0.26)', // 水
    blobD: 'rgba(80,140,200,0.20)', // 深瀬
    accent: '#3E86BE',
    accentDeep: '#2C6795',
    accentSoft: 'rgba(62,134,190,0.14)',
    heroGrad: ['#D8ECF8', '#9CC9EA', '#6BA6D6'],
    heroOn: '#14314A',
    heroSoft: 'rgba(20,49,74,0.70)',
    heroBlob: ['#EAF5FC', '#B7D9F0', '#8FBFE4'],
    shadowInk: '#123B5C',
  },
  // 秋「琥珀」― 従来の Warm Liquid Glass をそのまま秋として引き継ぐ。
  autumn: {
    bgTop: '#FCF7EF',
    bg: '#F6EFE6',
    bgBottom: '#F1E7D9',
    card: '#FFFDFA',
    surface: '#F4EDE3',
    border: '#E9DECF',
    borderSoft: '#F0E8DC',
    blobA: 'rgba(255,193,120,0.40)', // 琥珀
    blobB: 'rgba(255,214,150,0.36)', // 金
    blobC: 'rgba(255,168,140,0.34)', // 桃
    blobD: 'rgba(255,150,135,0.24)', // 珊瑚
    accent: '#E08A45',
    accentDeep: '#C56A2C',
    accentSoft: 'rgba(224,138,69,0.14)',
    heroGrad: ['#FFE6B4', '#F6B36B', '#EE9A6E'],
    heroOn: '#3A2410',
    heroSoft: 'rgba(58,36,16,0.68)',
    heroBlob: ['#FFF1D2', '#FFC487', '#F7A98C'],
    shadowInk: '#5A3210',
  },
  // 冬「雪明かり」― ほぼ白。氷の影と青灰のアクセントだけを残す。
  winter: {
    bgTop: '#FCFDFE',
    bg: '#F7F9FB',
    bgBottom: '#EFF3F7',
    card: '#FDFEFF',
    surface: '#F1F4F8',
    border: '#DFE6ED',
    borderSoft: '#EAF0F5',
    blobA: 'rgba(176,200,224,0.30)', // 氷
    blobB: 'rgba(210,222,234,0.38)', // 銀
    blobC: 'rgba(150,180,210,0.20)', // 青影
    blobD: 'rgba(184,196,230,0.18)', // 淡雪の紫影
    accent: '#5E86A6',
    accentDeep: '#44688A',
    accentSoft: 'rgba(94,134,166,0.14)',
    heroGrad: ['#FAFCFE', '#E4EBF3', '#CBD8E5'],
    heroOn: '#26384A',
    heroSoft: 'rgba(38,56,74,0.66)',
    heroBlob: ['#FFFFFF', '#DDE7F1', '#C4D4E4'],
    shadowInk: '#2E4258',
  },
};

const L = SEASONS[SEASON];

export const C = {
  // インク(温かみのある黒に近い茶)― 季節で変えない
  text: '#2A1F17',
  textSoft: '#7A6A5C',
  textMute: '#B4A595',

  // 背景(季節の地)。実際のグラデ/光のブロブは GradientBackground 側。
  bg: L.bg,
  bgTop: L.bgTop,
  bgBottom: L.bgBottom,

  // ガラス面 ― 季節で変えない
  glassFill: 'rgba(255,252,246,0.56)', // 温白の白かぶせ
  glassFillStrong: 'rgba(255,252,246,0.74)',
  glassEdge: 'rgba(255,255,255,0.8)', // 上側ハイライト境界
  glassEdgeSoft: 'rgba(255,255,255,0.45)',
  hairline: 'rgba(42,31,23,0.07)',

  // 単色面(フォーム/テーブルなど可読性優先)― 紙色だけ季節に寄せる
  card: L.card,
  surface: L.surface,
  border: L.border,
  borderSoft: L.borderSoft,

  // プライマリ(濃いインク)― 季節で変えない
  primary: '#2A1C12',
  onPrimary: '#FFF8EF',

  // アクセント(季節の色)
  accent: L.accent,
  accentDeep: L.accentDeep,
  accentSoft: L.accentSoft,
  coral: '#E8765A',

  // セマンティック ― 意味が固定なので季節で変えない
  danger: '#D85A45',
  dangerSoft: 'rgba(216,90,69,0.13)',
  warn: '#C98A2B',
  warnSoft: 'rgba(201,138,43,0.15)',
  success: '#5C9A5A',
  successSoft: 'rgba(92,154,90,0.16)',
  info: '#C08A4A',
  infoSoft: 'rgba(192,138,74,0.13)',

  // 健康状態(棚ビュー)― 季節で変えない
  good: '#CBE2A8',
  isolated: '#F2BBA6',
  empty: 'rgba(255,255,255,0.5)',

  // 背景の光ブロブ(季節の光。GradientBackground の4灯)
  blobA: L.blobA,
  blobB: L.blobB,
  blobC: L.blobC,
  blobD: L.blobD,
} as const;

/** ヒーロー(ホーム上部)の季節光。Hero.tsx が参照する。 */
export const HERO: {
  grad: [string, string, string];
  on: string;
  soft: string;
  blob: [string, string, string];
} = {
  grad: L.heroGrad,
  on: L.heroOn,
  soft: L.heroSoft,
  blob: L.heroBlob,
};

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
    shadowColor: L.shadowInk,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  soft: {
    shadowColor: L.shadowInk,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: L.shadowInk,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const;
