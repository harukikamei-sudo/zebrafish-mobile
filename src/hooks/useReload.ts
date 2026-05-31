import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useDataVersion } from '../state/store';

/**
 * 画面の再読込トリガ。
 * - 画面がフォーカスされる度(タブ切替・戻る)に増える
 * - グローバルな bumpData() でも増える(他画面/同期での変更を反映)
 * 戻り値を useMemo の依存配列に入れて使う。
 */
export function useReload(): number {
  const version = useDataVersion();
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );
  return version + tick;
}
