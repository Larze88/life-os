import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Card className="items-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
