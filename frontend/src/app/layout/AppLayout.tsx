import { Plus, WifiOff } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { QuickAddProvider, useQuickAddSheet } from '@/features/tracking/QuickAddSheet';
import { de } from '@/lib/i18n/de';
import { useOnlineStatus } from '@/lib/use-online-status';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

/**
 * Mobile: content + bottom tab bar with a central quick-add button (thumb reach).
 * Desktop (md+): sidebar navigation. docs/PRD.md §7.
 */
export function AppLayout() {
  return (
    <QuickAddProvider>
      <AppShell />
    </QuickAddProvider>
  );
}

function AppShell() {
  const online = useOnlineStatus();
  const quickAdd = useQuickAddSheet();
  const openQuickAdd = () => quickAdd.open();
  const [first, second, third, fourth] = navItems;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card/60 p-5 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-1">
          <Logo className="size-9" />
          <span className="text-lg font-semibold tracking-tight">{de.app.name}</span>
        </div>
        <Button onClick={openQuickAdd} className="justify-start">
          <Plus /> {de.nav.quickAdd}
        </Button>
        <nav aria-label={de.nav.main} className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  isActive && 'bg-accent text-foreground',
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!online && (
          <div
            role="status"
            className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-sm text-amber-800 backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))] dark:text-amber-200"
          >
            <WifiOff className="size-4" /> {de.common.offline}
          </div>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label={de.nav.main}
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {[first, second].map((item) => item && <TabLink key={item.to} {...item} />)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={openQuickAdd}
              aria-label={de.nav.quickAdd}
              className="flex size-13 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
          {[third, fourth].map((item) => item && <TabLink key={item.to} {...item} />)}
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Plus }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors',
          isActive && 'text-foreground',
        )
      }
    >
      <Icon className="size-6" strokeWidth={1.8} />
      {label}
    </NavLink>
  );
}
