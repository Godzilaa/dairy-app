import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

export type PieSlice = {
  key: string;
  label: string;
  color: string;
  value: number;
};

type Props = {
  slices: PieSlice[]; // only positive values; caller filters out zeros
  size?: number;
  strokeWidth?: number; // > 0 renders a donut with a hole of this thickness
};

// Convert a polar angle (degrees, 0 = 12 o'clock, clockwise) to an SVG point.
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// A simple category pie/donut chart drawn with react-native-svg (same lib the
// milk line chart uses — no extra dependency). Angles are laid out clockwise
// from the top.
export default function ExpensePieChart({ slices, size = 180, strokeWidth = 34 }: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  if (total <= 0) return <Svg width={size} height={size} />;

  // A single slice can't be described by an arc path (start == end), so draw a
  // full circle instead.
  if (slices.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={r - strokeWidth / 2}
          fill="none"
          stroke={slices[0].color}
          strokeWidth={strokeWidth}
        />
      </Svg>
    );
  }

  let angle = 0;
  const arcR = r - strokeWidth / 2;

  return (
    <Svg width={size} height={size}>
      <G>
        {slices.map((s) => {
          const sweep = (s.value / total) * 360;
          const start = angle;
          const end = angle + sweep;
          angle = end;
          const p1 = polar(cx, cy, arcR, start);
          const p2 = polar(cx, cy, arcR, end);
          const largeArc = sweep > 180 ? 1 : 0;
          const d = `M ${p1.x} ${p1.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
          return (
            <Path
              key={s.key}
              d={d}
              stroke={s.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
            />
          );
        })}
      </G>
    </Svg>
  );
}
