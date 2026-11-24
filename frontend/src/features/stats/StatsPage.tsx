import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { de } from '@/lib/i18n/de';

export function StatsPage() {
  return (
    <>
      <PageHeader title={de.stats.title} />
      <EmptyState icon={BarChart3} text={de.stats.empty} />
    </>
  );
}
