import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pb-5 pt-2 md:pt-8">
      <div>
        {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {actions}
    </header>
  );
}
