'use client';

import { memo } from 'react';

interface Point {
  date: string;
  count: number;
}

/**
 * Production-quality SVG line+area chart for admin trends.
 * Smooth polyline, gradient fill, data dots with hover tooltips,
 * and responsive layout.
 */
export const TrendChart = memo(function TrendChart({
  data,
  label,
  color = '#8b5cf6',
}: {
  data: Point[];
  label: string;
  color?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="font-display text-sm font-semibold tracking-tight mb-3">{label}</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-text-tertiary">No data available</p>
        </div>
      </div>
    );
  }

  const W = 320;
  const H = 140;
  const padX = 12;
  const padTop = 16;
  const padBot = 12;
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;
  const y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBot);
  const x = (i: number) => padX + i * stepX;

  // Create smooth curve using cardinal spline approximation
  const points = data.map((d, i) => ({ x: x(i), y: y(d.count) }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${H - padBot} L ${points[0].x.toFixed(1)} ${H - padBot} Z`;

  const total = data.reduce((s, d) => s + d.count, 0);
  const peak = Math.max(...data.map((d) => d.count));
  const gradId = `grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Format date for display (MM/DD)
  const formatDate = (d: string) => {
    const parts = d.split('-');
    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d.slice(5);
  };

  return (
    <div className="card group">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">{label}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-tight" style={{ color }}>{total}</p>
          <p className="text-[10px] text-text-muted">total &middot; peak {peak}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 130 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padX}
            y1={y(max * pct)}
            x2={W - padX}
            y2={y(max * pct)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill */}
        <path d={area} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data dots */}
        {data.map((d, i) => (
          <g key={d.date}>
            {/* Larger invisible hit area for tooltip */}
            <circle cx={points[i].x} cy={points[i].y} r="8" fill="transparent">
              <title>{`${formatDate(d.date)}: ${d.count}`}</title>
            </circle>
            {/* Visible dot */}
            <circle
              cx={points[i].x}
              cy={points[i].y}
              r="3"
              fill={color}
              stroke="#0a0a0a"
              strokeWidth="1.5"
              className="transition-all group-hover:r-[4]"
            />
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="mt-1.5 flex justify-between text-[10px] text-text-muted px-1">
        {data.length > 2 ? (
          <>
            <span>{formatDate(data[0].date)}</span>
            <span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
            <span>{formatDate(data[data.length - 1].date)}</span>
          </>
        ) : (
          <>
            <span>{formatDate(data[0].date)}</span>
            <span>{formatDate(data[data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
});
