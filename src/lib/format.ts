/** 表示用フォーマット・ログ整形(元 app.py の format_location / humanize_log を移植) */

/** 場所コードを 'wild-A-01' 形式に整形。値が欠けていれば空文字。 */
export function formatLocation(
  rack: string | null | undefined,
  tier: string | null | undefined,
  colNo: number | string | null | undefined,
): string {
  if (!rack || tier === null || tier === undefined || tier === '' || colNo === null || colNo === undefined || colNo === '') {
    return '';
  }
  const n = typeof colNo === 'string' ? parseInt(colNo, 10) : colNo;
  if (Number.isNaN(n)) return '';
  return `${rack}-${tier}-${String(n).padStart(2, '0')}`;
}

/** 匹数を "♂5 / ♀3 / ？1" のように整形。全0なら "空"。 */
export function fmtCounts(
  m: number | null | undefined,
  f: number | null | undefined,
  u: number | null | undefined,
  opts: { withTotal?: boolean } = {},
): string {
  const mm = m || 0;
  const ff = f || 0;
  const uu = u || 0;
  const tot = mm + ff + uu;
  if (tot === 0) return '空';
  const parts: string[] = [];
  if (mm > 0) parts.push(`♂${mm}`);
  if (ff > 0) parts.push(`♀${ff}`);
  if (uu > 0) parts.push(`？${uu}`);
  let s = parts.join(' / ');
  if (opts.withTotal) s += `  計${tot}`;
  return s;
}

export interface LogRow {
  category: string;
  actor?: string | null;
  target?: string | null;
  details?: string | null;
}

/** アクティビティログ行を自然な日本語に整形(元 humanize_log の移植) */
export function humanizeLog(row: LogRow): string {
  const cat = row.category || '';
  const actor = row.actor || null;
  const target = row.target || null;
  const details = row.details || null;
  const actorPrefix = actor ? `${actor} さんが ` : '';
  const tgt = target ? String(target) : '';
  const det = details ? String(details) : '';

  switch (cat) {
    case '餌やり': {
      let msg = `${actorPrefix}餌やりしました`;
      if (det && det !== '全水槽給餌') msg += `（${det}）`;
      return msg;
    }
    case '水槽登録/更新': {
      let msg = `${actorPrefix}水槽 ${tgt} を登録/更新しました`;
      if (det) msg += `（${det}）`;
      return msg;
    }
    case '水槽削除':
      return `${actorPrefix}水槽 ${tgt} を削除しました`;
    case '水槽スワップ':
      return `${actorPrefix}水槽 ${tgt} の中身を入れ替えました`;
    case '群登録/更新':
    case '群更新': {
      let msg = `${actorPrefix}群 ${tgt} を編集しました`;
      if (det) msg += `（${det}）`;
      return msg;
    }
    case '群削除':
      return `${actorPrefix}群 ${tgt} を削除しました`;
    case 'トライアル計画': {
      let msg = `${actorPrefix}トライアル ${tgt} を計画しました`;
      if (det) msg += ` — ${det}`;
      return msg;
    }
    case 'トライアル前日セット':
      return `${actorPrefix}トライアル ${tgt} を前日セット完了にしました`;
    case '仕切り取り出し':
      return `${actorPrefix}トライアル ${tgt} の仕切りを取り出しました`;
    case '採卵': {
      let msg = `${actorPrefix}トライアル ${tgt} で採卵しました`;
      if (det) msg += `（${det}）`;
      return msg;
    }
    case 'トライアル戻し完了':
      return `${actorPrefix}トライアル ${tgt} の戻しを完了しました`;
    case 'トライアル中止':
      return `${actorPrefix}トライアル ${tgt} を中止しました`;
    case '産卵成績(手入力)': {
      let msg = `${actorPrefix}産卵成績を手入力しました`;
      if (det) msg += ` — ${det}`;
      return msg;
    }
    case 'ログ削除': {
      let msg = `${actorPrefix}古いログを削除しました`;
      if (det) msg += `（${det}）`;
      return msg;
    }
    case '同期': {
      let msg = `${actorPrefix}データを同期しました`;
      if (det) msg += `（${det}）`;
      return msg;
    }
    default: {
      let msg = `${actorPrefix}${cat}`;
      if (tgt) msg += ` ${tgt}`;
      if (det) msg += ` — ${det}`;
      return msg;
    }
  }
}
