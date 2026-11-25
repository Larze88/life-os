import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Tracker, Widget } from '@lifeos/shared';
import { ModuleSheet } from '@/components/tracking/ModuleSheet';
import { Button } from '@/components/ui/button';
import { useTrackers } from '@/features/tracking/tracking-api';
import { ApiError } from '@/lib/api';
import { de } from '@/lib/i18n/de';
import { cn } from '@/lib/utils';
import { getWidgetComponent, getWidgetTitle } from '@/modules/registry';
import { useDashboardWidgets, useSaveLayout } from './dashboard-api';

function widgetName(widget: Widget, trackers: Tracker[]): string {
  const tracker = trackers.find((t) => t.id === widget.trackerId);
  return tracker?.name ?? getWidgetTitle(widget.widgetType) ?? widget.widgetType;
}

export function DashboardEditSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ModuleSheet title={de.dashboard.title} open={open} onOpenChange={onOpenChange}>
      <p className="-mt-2 text-sm text-muted-foreground">{de.dashboard.description}</p>
      <Editor onDone={() => onOpenChange(false)} />
    </ModuleSheet>
  );
}

function Editor({ onDone }: { onDone: () => void }) {
  const widgets = useDashboardWidgets(true);
  const trackers = useTrackers();
  if (!widgets.data || !trackers.data)
    return <p className="text-sm text-muted-foreground">{de.common.loading}</p>;
  // Only widget types this app version knows can be shown and edited.
  const known = widgets.data.widgets.filter((w) => getWidgetComponent(w.widgetType));
  return (
    <EditorList
      initial={known}
      all={widgets.data.widgets}
      trackers={trackers.data}
      onDone={onDone}
    />
  );
}

function EditorList({
  initial,
  all,
  trackers,
  onDone,
}: {
  initial: Widget[];
  all: Widget[];
  trackers: Tracker[];
  onDone: () => void;
}) {
  const [items, setItems] = useState(initial);
  const save = useSaveLayout();

  const move = (index: number, delta: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  const toggle = (id: string) =>
    setItems((list) => list.map((w) => (w.id === id ? { ...w, hidden: !w.hidden } : w)));

  function onSave() {
    // Widgets unknown to this app version keep their place at the end.
    const unknown = all.filter((w) => !items.some((i) => i.id === w.id));
    save.mutate(
      { widgets: [...items, ...unknown].map((w) => ({ id: w.id, hidden: w.hidden })) },
      {
        onSuccess: () => {
          toast.success(de.dashboard.saved);
          onDone();
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError && error.status === 409
              ? de.dashboard.conflict
              : de.common.notSaved,
          ),
      },
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y rounded-xl bg-card ring-1 ring-border/60">
        {items.map((w, i) => {
          const name = widgetName(w, trackers);
          return (
            <li key={w.id} className="flex min-h-14 items-center gap-1 py-1 pl-4 pr-1">
              <button
                type="button"
                role="switch"
                aria-checked={!w.hidden}
                aria-label={de.dashboard.show(name)}
                onClick={() => toggle(w.id)}
                className={cn(
                  'relative mr-3 h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  w.hidden ? 'bg-input' : 'bg-primary',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 size-5 rounded-full bg-background shadow transition-transform',
                    !w.hidden && 'translate-x-5',
                  )}
                />
              </button>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate font-medium',
                  w.hidden && 'text-muted-foreground',
                )}
              >
                {name}
                {w.hidden && (
                  <span className="ml-2 text-xs font-normal">({de.dashboard.hidden})</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={de.dashboard.moveUp(name)}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={de.dashboard.moveDown(name)}
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button size="lg" onClick={onSave} disabled={save.isPending}>
        {de.dashboard.save}
      </Button>
    </>
  );
}
