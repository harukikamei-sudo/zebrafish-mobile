import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoSync, tickAutoSync, scheduleAutoSync, markSyncActivity } from '../sync/sheets';
import { subscribeData } from '../state/store';

/**
 * 自動同期ドライバ(画面なし)。
 * - アプリ起動時・バックグラウンドから復帰(active)時: 即同期+バースト開始
 * - データ書込(bumpData)の数秒後: デバウンス送信(記録が他端末へすぐ届くように)
 * - 約10秒ごとの刻み(フォアグラウンド中のみ): 作業中(バースト中)は毎回、
 *   静かになったら5分間隔に落ちる(tickAutoSync 内で判定)
 * いずれも URL 未設定・同期中・直近実行済みならスキップ(sheets.ts 内で判定)。
 */
export function AutoSync() {
  useEffect(() => {
    markSyncActivity();
    autoSync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        markSyncActivity();
        autoSync();
      }
    });
    const id = setInterval(() => tickAutoSync(), 10 * 1000);
    const unsub = subscribeData(() => scheduleAutoSync());
    return () => {
      sub.remove();
      clearInterval(id);
      unsub();
    };
  }, []);
  return null;
}
