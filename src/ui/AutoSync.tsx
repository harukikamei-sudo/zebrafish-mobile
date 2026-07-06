import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoSync, scheduleAutoSync } from '../sync/sheets';
import { subscribeData } from '../state/store';

/**
 * 自動同期ドライバ(画面なし)。
 * - アプリ起動時
 * - バックグラウンドから復帰(active)時
 * - 5分ごと(フォアグラウンド中のみ)
 * - データ書込(bumpData)の数秒後(デバウンス。記録が他端末へすぐ届くように)
 * いずれも URL 未設定・同期中・直近実行済みならスキップ(sheets.ts 内で判定)。
 */
export function AutoSync() {
  useEffect(() => {
    autoSync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') autoSync();
    });
    const id = setInterval(() => autoSync(), 5 * 60 * 1000);
    const unsub = subscribeData(() => scheduleAutoSync());
    return () => {
      sub.remove();
      clearInterval(id);
      unsub();
    };
  }, []);
  return null;
}
