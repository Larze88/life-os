import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label={label}>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      {children}
    </div>
  );
}
