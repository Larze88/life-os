import { useState } from 'react';
import { CORRELATION_MIN_DAYS, correlationStrength, type Tracker } from '@lifeos/shared';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatDecimal } from '@/lib/format';
import { de } from '@/lib/i18n/de';
import { getFrontendModule } from '@/modules/registry';
import { useCorrelation } from './stats-api';

const t = de.stats.correlation;

function formatFor(tracker: Tracker | undefined) {
  const fmt = tracker ? getFrontendModule(tracker.module)?.formatValue : undefined;
  return (v: number) => (fmt && tracker ? fmt(v, tracker) : formatDecimal(v));
}

function TrackerSelect({
  id,
  label,
  trackers,
  value,
  onChange,
}: {
  id: string;
  label: string;
  trackers: Tracker[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {trackers.map((tr) => (
          <option key={tr.id} value={tr.id}>
            {tr.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CorrelationCard({
  trackers,
  from,
  to,
}: {
  trackers: Tracker[];
  from: string;
  to: string;
}) {
  const [selectedA, setA] = useState<string>();
  const [selectedB, setB] = useState<string>();
  const [lag, setLag] = useState(false);
  // Sensible default pair (derived): sleep → mood.
  const a = selectedA ?? (trackers.find((tr) => tr.key === 'sleep') ?? trackers[0])?.id;
  const b = selectedB ?? (trackers.find((tr) => tr.key === 'mood') ?? trackers[1])?.id;

  const correlation = useCorrelation(a, b, from, to, lag ? 1 : 0);
  const ta = trackers.find((tr) => tr.id === a);
  const tb = trackers.find((tr) => tr.id === b);
  const data = correlation.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.intro}</CardDescription>
      </CardHeader>
      <div className="flex gap-3">
        <TrackerSelect id="corr-a" label={t.a} trackers={trackers} value={a} onChange={setA} />
        <TrackerSelect id="corr-b" label={t.b} trackers={trackers} value={b} onChange={setB} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={lag}
          onChange={(e) => setLag(e.target.checked)}
          className="size-5 accent-current"
        />
        {t.lag}
      </label>

      {a && a === b && <p className="text-sm text-muted-foreground">{t.sameTracker}</p>}
      {data && ta && tb && a !== b && (
        <>
          {data.rho === null ? (
            <p className="text-sm text-muted-foreground">
              {t.tooFew(data.n, CORRELATION_MIN_DAYS)}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                {t.summary(t.strength[correlationStrength(data.rho)]!)}
                {correlationStrength(data.rho) === 'none' ? '.' : ':'}
              </p>
              {correlationStrength(data.rho) !== 'none' && (
                <p className="text-sm">{t.direction(ta.name, tb.name, data.rho > 0)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t.coefficient}: {formatDecimal(data.rho, 2)} · {t.days(data.n)}
              </p>
            </div>
          )}
          {data.pairs.length > 1 && <Scatter pairs={data.pairs} ta={ta} tb={tb} />}
        </>
      )}
    </Card>
  );
}

function Scatter({
  pairs,
  ta,
  tb,
}: {
  pairs: { a: number; b: number }[];
  ta: Tracker;
  tb: Tracker;
}) {
  const W = 320;
  const H = 220;
  const pad = { l: 12, r: 12, t: 12, b: 36 };
  const xs = pairs.map((p) => p.a);
  const ys = pairs.map((p) => p.b);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  // Points stay inside the plot area (inset), so extreme values don't touch the edge.
  const inset = 12;
  const sx = (v: number) =>
    pad.l + inset + ((v - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r - 2 * inset);
  const sy = (v: number) =>
    H - pad.b - inset - ((v - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b - 2 * inset);
  const fa = formatFor(ta);
  const fb = formatFor(tb);
  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={t.scatterLabel(ta.name, tb.name)}
      >
        <rect
          x={pad.l}
          y={pad.t}
          width={W - pad.l - pad.r}
          height={H - pad.t - pad.b}
          className="fill-muted/40"
          rx={8}
        />
        {pairs.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.a)}
            cy={sy(p.b)}
            r={5}
            // Semi-transparent with a surface ring: identical days appear as darker clusters.
            className="fill-primary/45 stroke-card"
            strokeWidth={1.5}
          />
        ))}
        <text x={pad.l} y={H - 18} className="fill-muted-foreground text-[10px]">
          {fa(x0)}
        </text>
        <text
          x={W - pad.r}
          y={H - 18}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          {fa(x1)}
        </text>
        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-medium"
        >
          {ta.name} →
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        ↑ {tb.name}: {fb(y0)} – {fb(y1)}
      </figcaption>
    </figure>
  );
}
