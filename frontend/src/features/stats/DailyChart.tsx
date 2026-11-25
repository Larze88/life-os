import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChartPoint } from './buckets';

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 44 };

function niceStep(range: number): number {
  const raw = range / 3;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(
      ([entry]) => entry && setWidth(Math.max(200, entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Single-series chart (bars for amounts, line for levels). Tap/hover selects a point;
 * the readout above the chart shows its exact value. Colors come from the module token
 * via currentColor (`colorClass`); grid and labels stay in neutral text tokens.
 */
export function DailyChart({
  points,
  kind,
  colorClass,
  goal,
  format,
  formatAxis = format,
  label,
  formatDate,
}: {
  points: ChartPoint[];
  kind: 'bar' | 'line';
  colorClass: string;
  goal?: number | null;
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  label: string;
  formatDate: (p: ChartPoint) => string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const lastWithData = useMemo(() => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i]!.value !== null) return i;
    return points.length - 1;
  }, [points]);
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected !== null && selected < points.length ? selected : lastWithData;

  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const dataMax = Math.max(...values, goal ?? 0, 0);
  const dataMin = Math.min(...values, goal ?? Number.POSITIVE_INFINITY);
  // Bars always start at 0; lines may zoom in on the data range (e.g. body weight).
  const rawMin = kind === 'bar' || values.length === 0 ? 0 : dataMin - (dataMax - dataMin) * 0.15;
  const step = niceStep(Math.max(dataMax - rawMin, 1e-9) || 1);
  const yMin = kind === 'bar' ? 0 : Math.floor(rawMin / step) * step;
  const yMax = Math.max(Math.ceil((dataMax || 1) / step) * step, yMin + step);
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + step / 2; t += step) ticks.push(t);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(points.length, 1);
  const x = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const barW = Math.max(2, Math.min(24, slot - 2));

  const linePath = points
    .map((p, i) => (p.value === null ? null : `${x(i)},${y(p.value)}`))
    .reduce<string[]>((segments, pt, i) => {
      if (pt === null) return segments;
      const prevNull = i === 0 || points[i - 1]!.value === null;
      segments.push(`${prevNull ? 'M' : 'L'}${pt}`);
      return segments;
    }, [])
    .join(' ');

  function pick(clientX: number, target: SVGRectElement) {
    const rect = target.getBoundingClientRect();
    const i = Math.floor(((clientX - rect.left) / rect.width) * points.length);
    setSelected(Math.min(points.length - 1, Math.max(0, i)));
  }

  const activePoint = points[active];
  const xLabels =
    points.length > 0
      ? [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
      : [];

  return (
    <div ref={ref} className="w-full">
      <p className="mb-1 min-h-6 text-sm" aria-live="polite">
        {activePoint && (
          <>
            <span className="text-muted-foreground">{formatDate(activePoint)}: </span>
            <span className="font-semibold tabular-nums">
              {activePoint.value === null ? '–' : format(activePoint.value)}
            </span>
          </>
        )}
      </p>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={label}
        className="block touch-pan-y select-none"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-muted-foreground text-[10px] tabular-nums"
            >
              {formatAxis(t)}
            </text>
          </g>
        ))}
        {goal != null && goal >= yMin && goal <= yMax && (
          <g>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(goal)}
              y2={y(goal)}
              className="stroke-foreground/50"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text
              x={width - PAD.right}
              y={y(goal) - 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              Ziel
            </text>
          </g>
        )}
        <g className={colorClass}>
          {kind === 'bar' ? (
            points.map((p, i) => {
              if (p.value === null || p.value <= 0) return null;
              const top = y(p.value);
              const h = y(yMin) - top;
              const r = Math.min(4, barW / 2, h);
              const left = x(i) - barW / 2;
              // Rounded data end at the top, square at the baseline.
              const d = `M${left},${top + h} V${top + r} Q${left},${top} ${left + r},${top} H${left + barW - r} Q${left + barW},${top} ${left + barW},${top + r} V${top + h} Z`;
              return (
                <path key={p.date} d={d} fill="currentColor" opacity={i === active ? 1 : 0.75} />
              );
            })
          ) : (
            <>
              <path
                d={linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) =>
                p.value === null || (points.length > 31 && i !== active) ? null : (
                  <circle
                    key={p.date}
                    cx={x(i)}
                    cy={y(p.value)}
                    r={i === active ? 5 : 4}
                    fill="currentColor"
                    className="stroke-card"
                    strokeWidth={2}
                  />
                ),
              )}
            </>
          )}
        </g>
        {activePoint && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            className={cn('stroke-foreground/25')}
            strokeWidth={1}
          />
        )}
        {xLabels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="fill-muted-foreground text-[10px]"
          >
            {formatDate(points[i]!).replace(/^\w+, /, '')}
          </text>
        ))}
        <rect
          x={PAD.left}
          y={0}
          width={innerW}
          height={HEIGHT}
          fill="transparent"
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerMove={(e) =>
            (e.pointerType === 'mouse' || e.buttons) && pick(e.clientX, e.currentTarget)
          }
        />
      </svg>
    </div>
  );
}
