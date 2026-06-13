/**
 * Pure, dependency-free SVG sparkline.
 *
 * Plots a single normalized polyline (min/max scaled to fit) with a subtle area
 * fill underneath — no axes, no ticks, no hooks. Color follows `currentColor`,
 * so callers tint it with a text class (e.g. `className="text-gold"`). Renders
 * nothing when there are fewer than two points to draw.
 */

export interface SparklineProps {
  readonly data: number[];
  readonly className?: string;
  readonly width?: number;
  readonly height?: number;
  readonly stroke?: string;
}

export function Sparkline({
  data,
  className,
  width = 240,
  height = 64,
  stroke = "currentColor",
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  // Inset vertically by 1px so a flat top/bottom line isn't clipped by the stroke.
  const inset = 1;
  const usableHeight = height - inset * 2;

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = inset + (1 - (value - min) / range) * usableHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePoints = points.join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Price history sparkline"
    >
      <polygon points={areaPoints} fill={stroke} fillOpacity={0.08} stroke="none" />
      <polyline
        points={linePoints}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
