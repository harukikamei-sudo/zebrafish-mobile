/** Open-Meteo(無料・APIキー不要)から東京の現在天気を取得。元 app.py より移植。 */

export interface Weather {
  temp: number | null;
  code: number | null;
}

export interface WeatherVisual {
  label: string;
  emoji: string;
  /** ヒーロー背景グラデ([上, 下]) */
  grad: [string, string];
  /** 主テキスト色(見出し・挨拶) */
  onColor: string;
  /** 副テキスト色(一言・時計) */
  softColor: string;
  /** 天気チップ背景/文字 */
  chipBg: string;
  chipFg: string;
}

/** 天気が取れない/読み込み中の既定(温かい琥珀) */
export const DEFAULT_HERO: WeatherVisual = {
  label: '',
  emoji: '',
  grad: ['#F4CE97', '#E89B52'],
  onColor: '#3A2410',
  softColor: 'rgba(58,36,16,0.72)',
  chipBg: 'rgba(255,255,255,0.55)',
  chipFg: '#9A5A1E',
};

export async function fetchWeather(): Promise<Weather | null> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69' +
      '&current_weather=true&timezone=Asia%2FTokyo';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const cw = data?.current_weather ?? {};
    return { temp: cw.temperature ?? null, code: cw.weathercode ?? null };
  } catch {
    return null;
  }
}

// 明るい背景(暗文字)用のチップ
const LIGHT_CHIP = { chipBg: 'rgba(0,0,0,0.06)', chipFg: '#23303A' };
// 暗い背景(白文字)用のチップ
const DARK_CHIP = { chipBg: 'rgba(255,255,255,0.22)', chipFg: '#FFFFFF' };
const WHITE = '#FFFFFF';
const WHITE_SOFT = 'rgba(255,255,255,0.9)';
const INK = '#23303A';
const INK_SOFT = 'rgba(35,48,58,0.78)';

/** iPhone 天気アプリ風に、天気コードからヒーローの配色を返す(可読性を担保) */
export function weatherVisual(code: number | null): WeatherVisual | null {
  if (code === null || code === undefined) return null;
  const dark = (label: string, emoji: string, grad: [string, string]): WeatherVisual => ({
    label, emoji, grad, onColor: WHITE, softColor: WHITE_SOFT, ...DARK_CHIP,
  });
  const light = (label: string, emoji: string, grad: [string, string]): WeatherVisual => ({
    label, emoji, grad, onColor: INK, softColor: INK_SOFT, ...LIGHT_CHIP,
  });

  if (code === 0) return dark('快晴', '☀️', ['#3E8FD0', '#7FC4EC']);
  if (code === 1 || code === 2) return dark('晴れ', '🌤️', ['#4E97D6', '#8CCDEF']);
  if (code === 3) return dark('曇り', '☁️', ['#7E8B99', '#AEB8C2']);
  if (code === 45 || code === 48) return light('霧', '🌫️', ['#AEB8C0', '#D2D9DE']);
  if ([51, 53, 55, 56, 57].includes(code)) return dark('小雨', '🌦️', ['#4A6685', '#7C97B3']);
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return dark('雨', '🌧️', ['#324B66', '#56708C']);
  if ([71, 73, 75, 77, 85, 86].includes(code)) return light('雪', '❄️', ['#BBD6E8', '#EAF2F9']);
  if ([95, 96, 99].includes(code)) return dark('雷雨', '⛈️', ['#2A2A48', '#4B3A6B']);
  return null;
}
