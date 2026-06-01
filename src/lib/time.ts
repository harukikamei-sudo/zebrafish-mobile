/**
 * 時刻ヘルパ。元の Streamlit 版に合わせ、ドメインの時刻はすべて JST(日本標準時) 固定で扱う。
 * - ドメイン時刻(fed_at, occurred_at, set_date など)は "YYYY-MM-DD HH:MM:SS" の JST 壁時計表記
 * - 同期用の updated_at は UTC ISO 文字列(辞書順比較で Last-Write-Wins に使う)
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 現在の JST 壁時計を "YYYY-MM-DD HH:MM:SS" で返す(DB保存用) */
export function nowIso(): string {
  const shifted = new Date(Date.now() + JST_OFFSET_MS);
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    ` ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  );
}

/** 今日の日付(JST) "YYYY-MM-DD" */
export function todayJst(): string {
  return nowIso().slice(0, 10);
}

/** JST 壁時計表記を実エポックms に変換 */
function parseJstToEpoch(iso: string): number | null {
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  // wall-clock を UTC とみなした値から 9h 引いて実 UTC エポックへ
  return Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss) - JST_OFFSET_MS;
}

/** 指定した JST 時刻文字列から現在までの経過時間(時間)。不正なら null */
export function hoursSince(iso: string | null | undefined): number | null {
  const wall = toJstWall(iso);
  if (!wall) return null;
  const t = parseJstToEpoch(wall);
  if (t === null) return null;
  return (Date.now() - t) / 3_600_000;
}

/** 同期用の更新時刻(UTC ISO, ミリ秒付き) */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** "YYYY-MM-DD" に N 日加算 */
export function addDays(dateStr: string, days: number): string {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const t = Date.UTC(+y, +mo - 1, +d) + days * 86_400_000;
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${pad(nd.getUTCMonth() + 1)}-${pad(nd.getUTCDate())}`;
}

const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土'];

/** "YYYY-MM-DD" → "2026年 05月 31日（土）" のような日本語表記 */
export function formatJpDate(dateStr: string): string {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const wd = WEEKDAYS_JP[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  return `${y}年 ${mo}月 ${d}日（${wd}）`;
}

/**
 * 任意の日時表現を JST 壁時計 "YYYY-MM-DD HH:MM:SS" に正規化する。
 * ドメイン時刻(fed_at 等)は JST 壁時計で保持する規約だが、Google Sheets がセルを
 * 日付型と解釈し、同期経由で UTC ISO("…T…Z")やスラッシュ区切りに化けることがある。
 * その取り違えを吸収して常に JST 壁時計へ戻す。
 *  - "YYYY-MM-DD HH:MM:SS"(壁時計) はそのまま
 *  - "YYYY/MM/DD …" のスラッシュ区切りはハイフンへ統一
 *  - "…T…Z" / 末尾オフセット付きの UTC ISO は実エポックとみなし +9h して壁時計化
 *  - 解釈できなければ原文を返す
 */
export function toJstWall(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str) return str;
  // 絶対時刻(UTC ISO 等): 'T' 区切りで末尾に Z もしくは ±HH:MM のオフセットを持つ
  const isAbsolute = str.includes('T') && /(Z|[+-]\d{2}:?\d{2})$/.test(str);
  if (isAbsolute) {
    const t = Date.parse(str);
    if (!Number.isNaN(t)) {
      const d = new Date(t + JST_OFFSET_MS);
      return (
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
        ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
      );
    }
  }
  // 壁時計表記: 区切りを '-' / 半角スペースに統一し、秒まで補う
  const m = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (m) {
    const [, y, mo, d, hh, mm, ss] = m;
    return `${y}-${pad(+mo)}-${pad(+d)} ${pad(+hh)}:${pad(+mm)}:${pad(ss ? +ss : 0)}`;
  }
  return str;
}

/** 時刻部分 "HH:MM" を取り出す(JST壁時計文字列から。UTC ISO 等が来ても JST に正規化) */
export function timeHm(iso: string | null | undefined): string {
  const wall = toJstWall(iso);
  if (!wall) return '—';
  const parts = wall.split(' ');
  return parts.length > 1 ? parts[1].slice(0, 5) : '—';
}

type Period = 'morning' | 'afternoon' | 'evening' | 'night';

function currentPeriod(): Period {
  const h = new Date(Date.now() + JST_OFFSET_MS).getUTCHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

const GREETING: Record<Period, string> = {
  morning: 'おはようございます',
  afternoon: 'こんにちは',
  evening: 'こんばんは',
  night: 'おつかれさまです',
};

const SUB_MESSAGES: Record<Period, string[]> = {
  morning: [
    '今日も一日がんばりましょう',
    '水温チェックはお済みですか？',
    'ゼブラフィッシュたちも目覚めの時間です',
    '朝の給餌から始めましょう',
    '今日もいい研究日和です',
  ],
  afternoon: [
    'お疲れさまです、調子はいかがですか？',
    '午後の観察もぬかりなく',
    '水槽の様子を見てあげましょう',
    'こまめな記録が成果につながります',
    'ひと息ついていきましょう',
  ],
  evening: [
    '今日もお疲れさまでした',
    '夕方の給餌を忘れずに',
    '一日の記録を振り返りましょう',
    'そろそろ最後の見回りを',
    '今日の成果はいかがでしたか？',
  ],
  night: [
    '遅くまでお疲れさまです',
    '無理せずいきましょう',
    '夜間の管理ありがとうございます',
    '水槽たちも休む時間です',
    '今日もよくがんばりました',
  ],
};

/** 時間帯に応じた挨拶(JST) */
export function greeting(): string {
  return GREETING[currentPeriod()];
}

/** 挨拶＋ランダムな一言(JST)。毎呼び出しで一言はランダムに変わる。 */
export function greetingParts(): { greeting: string; sub: string } {
  const p = currentPeriod();
  const pool = SUB_MESSAGES[p];
  const sub = pool[Math.floor(Math.random() * pool.length)];
  return { greeting: GREETING[p], sub };
}

/** 現在時刻 "HH:MM:SS"(JST) */
export function nowTimeHms(): string {
  const d = new Date(Date.now() + JST_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "M月D日(曜)" の短い日付 */
export function shortJpDate(dateStr: string): string {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const wd = WEEKDAYS_JP[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  return `${+mo}月${+d}日(${wd})`;
}
