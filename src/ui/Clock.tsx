import React, { useEffect, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

import { nowTimeHms, shortJpDate, todayJst } from '../lib/time';

/** 日付＋ライブ時刻(秒ごと更新)。自身だけ再描画する。 */
export function Clock({ style }: { style?: StyleProp<TextStyle> }) {
  const [t, setT] = useState(nowTimeHms());
  useEffect(() => {
    const id = setInterval(() => setT(nowTimeHms()), 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={style}>{`${shortJpDate(todayJst())}　${t}`}</Text>;
}
