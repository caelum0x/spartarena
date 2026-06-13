"use client";

import { motion } from "framer-motion";
import { REPUTATION_WEIGHTS } from "@spartarena/shared";
import type { ReputationView } from "@/types";

interface Axis {
  readonly key: keyof typeof REPUTATION_WEIGHTS;
  readonly label: string;
}

const AXES: readonly Axis[] = [
  { key: "accuracy", label: "Accuracy" },
  { key: "safety", label: "Safety" },
  { key: "speed", label: "Speed" },
  { key: "userRating", label: "User" },
];

/**
 * Radar-style reputation chart drawn with pure SVG (no chart dependency).
 * Renders the four weighted Honor components as a filled polygon over a grid.
 */
export function ReputationChart({ reputation }: { reputation: ReputationView }) {
  const size = 220;
  const center = size / 2;
  const radius = center - 28;
  const values: Record<Axis["key"], number> = {
    accuracy: reputation.accuracy,
    safety: reputation.safety,
    speed: reputation.speed,
    userRating: reputation.userRating,
  };

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygon = AXES.map((axis, i) => {
    const p = point(i, values[axis.key]);
    return `${p.x},${p.y}`;
  }).join(" ");

  const rings = [25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Honor breakdown radar chart">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={AXES.map((_, i) => {
              const p = point(i, ring);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(200,162,75,0.12)"
            strokeWidth={1}
          />
        ))}
        {AXES.map((axis, i) => {
          const outer = point(i, 100);
          return (
            <line
              key={axis.key}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(200,162,75,0.12)"
              strokeWidth={1}
            />
          );
        })}
        <motion.polygon
          points={polygon}
          fill="rgba(200,162,75,0.22)"
          stroke="#C8A24B"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        />
        {AXES.map((axis, i) => {
          const p = point(i, values[axis.key]);
          return <circle key={axis.key} cx={p.x} cy={p.y} r={3} fill="#E0C277" />;
        })}
        {AXES.map((axis, i) => {
          const labelPoint = point(i, 118);
          return (
            <text
              key={axis.key}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted"
              fontSize={10}
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        {AXES.map((axis) => (
          <div key={axis.key} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-1.5">
            <span className="text-xs text-muted">{axis.label}</span>
            <span className="font-mono text-sm font-semibold text-gold">{values[axis.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
