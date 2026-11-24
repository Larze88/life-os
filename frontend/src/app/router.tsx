import { createBrowserRouter, type RouteObject } from 'react-router';
import { AuthGate } from '@/features/auth/AuthGate';
import { LoginPage } from '@/features/auth/LoginPage';
import { SetupPage } from '@/features/auth/SetupPage';
import { TodayPage } from '@/features/dashboard/TodayPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatsPage } from '@/features/stats/StatsPage';
import { AppLayout } from './layout/AppLayout';

export const routes: RouteObject[] = [
  {
    element: <AuthGate require="setup" />,
    children: [{ path: '/einrichtung', element: <SetupPage /> }],
  },
  {
    element: <AuthGate require="login" />,
    children: [{ path: '/anmelden', element: <LoginPage /> }],
  },
  {
    element: <AuthGate require="app" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'verlauf', element: <HistoryPage /> },
          { path: 'statistik', element: <StatsPage /> },
          { path: 'einstellungen', element: <SettingsPage /> },
          { path: '*', element: <TodayPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
