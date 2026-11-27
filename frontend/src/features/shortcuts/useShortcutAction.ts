import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { DaySummary } from '@lifeos/shared';
import { useQuickAddSheet } from '@/features/tracking/QuickAddSheet';
import { useQuickAdd } from '@/features/tracking/use-quick-add';
import { de } from '@/lib/i18n/de';
import { getFrontendModule } from '@/modules/registry';
import { parseShortcutAction } from './shortcuts';

/**
 * Executes a home-screen shortcut once the day is loaded, then removes it from the URL
 * (so a reload does not record twice). Modules are addressed only through their generic
 * interfaces (DetailSheet / quick add), no module-specific code here.
 */
export function useShortcutAction(day: DaySummary | undefined, date: string) {
  const [params, setParams] = useSearchParams();
  // The action is read once when the dashboard opens.
  const [action] = useState(() => parseShortcutAction(params));
  const [sheetClosed, setSheetClosed] = useState(false);
  const handled = useRef(false);
  const quickAdd = useQuickAdd();
  const quickAddSheet = useQuickAddSheet();

  const target =
    action && action.type !== 'quickAdd'
      ? day?.trackers.find((t) => t.tracker.key === action.trackerKey)
      : undefined;
  const Sheet = target ? getFrontendModule(target.tracker.module)?.DetailSheet : undefined;

  useEffect(() => {
    if (!action || !day || handled.current) return;
    handled.current = true;
    setParams({}, { replace: true });
    if (action.type === 'quickAdd' || (action.type === 'open' && target && !Sheet)) {
      quickAddSheet.open(date);
    } else if (action.type === 'add' && target) {
      quickAdd.add({
        date,
        trackerId: target.tracker.id,
        value: action.value,
        message: de.shortcuts.added(target.tracker.name),
      });
    }
  }, [action, day, date, target, Sheet, quickAdd, quickAddSheet, setParams]);

  const openSheet = action?.type === 'open' && target && Sheet && !sheetClosed ? target : null;
  return { openSheet, Sheet, close: () => setSheetClosed(true) };
}
