import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoSync } from '../sync/sheets';

/**
 * 自動同期ドライバ(画面なし)。
 * - アプリ起動時
 * - バックグラウンドから復帰(active)時
 * - 5分ごと(フォアグラウンド中のみ)
 * いずれも URL 未設定・同期中・直近実行済みならスキップ(autoSync内で判定)。
 */
export function AutoSync() {
  useEffect(() => {
    autoSync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') autoSync();
    });
    const id = setInterval(() => autoSync(), 5 * 60 * 1000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return null;
}
