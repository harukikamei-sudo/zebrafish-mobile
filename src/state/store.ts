import { useSyncExternalStore } from 'react';

/**
 * 超軽量なグローバル変更通知。DB を書き換えたら bumpData() を呼ぶと、
 * マウント中の全画面が再読込される(タブをまたいだ更新・同期後の反映に使う)。
 */
let version = 0;
const listeners = new Set<() => void>();

export function bumpData(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): number {
  return version;
}

/** 現在のデータバージョン。これを useMemo の依存に入れると変更時に再計算される。 */
export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
