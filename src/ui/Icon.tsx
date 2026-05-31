import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { C } from '../lib/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** モノクロのライン/ソリッドアイコン(Ionicons)。既定色は温色アクセント。 */
export function Icon({
  name,
  size = 20,
  color = C.accentDeep,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** 餌やり用のエビ(ブラインシュリンプ)アイコン */
export function ShrimpIcon({ size = 20, color = C.accentDeep }: { size?: number; color?: string }) {
  return <FontAwesome6 name="shrimp" size={size} color={color} />;
}
