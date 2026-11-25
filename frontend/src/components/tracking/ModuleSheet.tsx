import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToday } from '@/features/tracking/tracking-api';
import { formatLocalDate } from '@/lib/format';
import { de } from '@/lib/i18n/de';

/** Bottom sheet with title and day subtitle; content is only mounted while open. */
export function ModuleSheet({
  title,
  date,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  date?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const today = useToday();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {date ? (date === today ? de.today.title : formatLocalDate(date)) : ' '}
          </SheetDescription>
        </SheetHeader>
        {open && children}
      </SheetContent>
    </Sheet>
  );
}
