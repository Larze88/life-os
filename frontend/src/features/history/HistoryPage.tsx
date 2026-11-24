import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { de } from '@/lib/i18n/de';

export function HistoryPage() {
  return (
    <>
      <PageHeader title={de.history.title} />
      <EmptyState icon={CalendarDays} text={de.history.empty} />
    </>
  );
}
