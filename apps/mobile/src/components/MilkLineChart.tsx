import React from 'react';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';

export type MilkSeries = {
  cowId: string;
  name: string;
  color: string;
  morning: (number | null)[]; // aligned to `dates`
  evening: (number | null)[];
};

type Props = {
  dates: string[];
  series: MilkSeries[];
  width: number;
  height?: number;
};

// Multi-cow line chart: each cow has a unique colour; a solid line for morning
// milk and a dashed line for evening, with a coloured dot at every reading.
// X = date, Y = litres.
export default function MilkLineChart({ dates, series, width, height = 260 }: Props) {
  const pL = 34, pR = 14, pT = 14, pB = 34;
  const innerW = Math.max(10, width - pL - pR);
  const innerH = Math.max(10, height - pT - pB);

  const maxVal = Math.max(
    1,
    ...series.flatMap((s) => [...s.morning, ...s.evening].map((v) => v ?? 0)),
  );
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

  const xFor = (i: number) => pL + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW);
  const yFor = (v: number) => pT + innerH - (v / niceMax) * innerH;

  // Build an SVG path, breaking the line wherever a reading is missing.
  const pathFor = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const yTicks = [0, niceMax / 2, niceMax];
  // Show at most ~6 date labels to avoid crowding.
  const step = Math.max(1, Math.ceil(dates.length / 6));

  return (
    <Svg width={width} height={height}>
      {/* Y gridlines + labels */}
      {yTicks.map((v, i) => (
        <React.Fragment key={`y${i}`}>
          <Line x1={pL} y1={yFor(v)} x2={pL + innerW} y2={yFor(v)} stroke="#EEEEEE" strokeWidth={1} />
          <SvgText x={pL - 6} y={yFor(v) + 4} fontSize={9} fill="#999" textAnchor="end">{v}</SvgText>
        </React.Fragment>
      ))}

      {/* X axis labels */}
      {dates.map((d, i) => (i % step === 0 ? (
        <SvgText key={`x${i}`} x={xFor(i)} y={height - 10} fontSize={9} fill="#999" textAnchor="middle">{d.slice(8)}</SvgText>
      ) : null))}

      {/* Per-cow lines + dots */}
      {series.map((s) => (
        <React.Fragment key={s.cowId}>
          <Path d={pathFor(s.morning)} stroke={s.color} strokeWidth={2} fill="none" />
          <Path d={pathFor(s.evening)} stroke={s.color} strokeWidth={2} fill="none" strokeDasharray="5,4" />
          {s.morning.map((v, i) => (v == null ? null : (
            <Circle key={`m${s.cowId}${i}`} cx={xFor(i)} cy={yFor(v)} r={2.6} fill={s.color} />
          )))}
          {s.evening.map((v, i) => (v == null ? null : (
            <Circle key={`e${s.cowId}${i}`} cx={xFor(i)} cy={yFor(v)} r={2.6} fill="#fff" stroke={s.color} strokeWidth={1.5} />
          )))}
        </React.Fragment>
      ))}
    </Svg>
  );
}
