import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

import { C, F, R } from '../lib/theme';

export interface Point {
  label: string; // x 軸ラベル(日付など)
  value: number; // y 値
}

/** 受精率などの推移を描く軽量な折れ線グラフ(react-native-svg) */
export function LineChart({
  data,
  height = 180,
  yMax = 100,
  yMin = 0,
  unit = '',
}: {
  data: Point[];
  height?: number;
  yMax?: number;
  yMin?: number;
  unit?: string;
}) {
  const [width, setWidth] = React.useState(0);
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  if (data.length === 0) {
    return (
      <View style={{ height }}>
        <Text style={styles.empty}>データがありません</Text>
      </View>
    );
  }

  const innerW = Math.max(1, width - padL - padR);
  const innerH = height - padT - padB;
  const n = data.length;
  const xOf = (i: number) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yOf = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');
  const gridVals = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {gridVals.map((gv, i) => {
            const y = yOf(gv);
            return (
              <React.Fragment key={i}>
                <Line x1={padL} y1={y} x2={width - padR} y2={y} stroke={C.borderSoft} strokeWidth={1} />
                <SvgText x={4} y={y + 4} fontSize={10} fill={C.textMute}>
                  {`${Math.round(gv)}${unit}`}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Polyline points={points} fill="none" stroke={C.accent} strokeWidth={2} />
          {data.map((d, i) => (
            <Circle key={i} cx={xOf(i)} cy={yOf(d.value)} r={3} fill={C.accent} />
          ))}
          {/* x 軸ラベルは最初と最後のみ */}
          <SvgText x={padL} y={height - 8} fontSize={9} fill={C.textMute}>
            {data[0].label}
          </SvgText>
          {n > 1 && (
            <SvgText x={width - padR} y={height - 8} fontSize={9} fill={C.textMute} textAnchor="end">
              {data[n - 1].label}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: C.textMute,
    fontSize: F.small,
    textAlign: 'center',
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: R.md,
  },
});
