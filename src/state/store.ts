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

/** データ変更(bumpData)の購読。UI 以外(書込後の自動同期トリガ等)から使う。 */
export function subscribeData(cb: () => void): () => void {
  return subscribe(cb);
}

function getSnapshot(): number {
  return version;
}

/** 現在のデータバージョン。これを useMemo の依存に入れると変更時に再計算される。 */
export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * トースト通知。操作成功などを画面下に数秒だけ出す即時フィードバック。
 * showToast() をどの画面/DB操作からでも呼べる(グローバル)。表示は ToastHost が担う。
 */
export interface Toast {
  msg: string;
  kind: 'success' | 'error' | 'info';
  id: number;
}
let toast: Toast | null = null;
let toastSeq = 0;
const toastListeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(msg: string, kind: Toast['kind'] = 'success'): void {
  toastSeq += 1;
  toast = { msg, kind, id: toastSeq };
  toastListeners.forEach((l) => l());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = null;
    toastListeners.forEach((l) => l());
  }, 2400);
}

function subToast(cb: () => void): () => void {
  toastListeners.add(cb);
  return () => toastListeners.delete(cb);
}
function getToast(): Toast | null {
  return toast;
}

/** 現在のトースト(なければ null)。ToastHost が購読する。 */
export function useToast(): Toast | null {
  return useSyncExternalStore(subToast, getToast, getToast);
}
