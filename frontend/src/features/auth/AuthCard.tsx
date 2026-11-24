import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo className="size-16 shadow-lg rounded-[15px]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/60">{children}</div>
      </div>
    </div>
  );
}
