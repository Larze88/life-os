import { cn } from '@/lib/utils';

/** App mark: three concentric progress rings, echoing the daily-overview rings. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-10', className)}>
      <defs>
        <linearGradient id="lifeos-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#lifeos-bg)" />
      <g fill="none" strokeLinecap="round" strokeWidth="5" transform="rotate(-90 32 32)">
        <circle cx="32" cy="32" r="21" stroke="#38bdf8" strokeDasharray="105 132" />
        <circle cx="32" cy="32" r="14" stroke="#a78bfa" strokeDasharray="62 88" />
        <circle cx="32" cy="32" r="7" stroke="#4ade80" strokeDasharray="34 44" />
      </g>
    </svg>
  );
}
