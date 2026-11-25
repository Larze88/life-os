import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { json, mockApi } from '@/test/mock-api';
import { renderApp } from '@/test/render';

vi.mock('@/lib/app-version', () => ({ APP_VERSION: '0.3.0' }));

function serve(serverVersion: string) {
  mockApi({
    'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
    'GET /api/v1/health': () => json({ status: 'ok', version: serverVersion }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('update banner', () => {
  it('appears when the server runs a newer version', async () => {
    serve('0.4.0');
    renderApp('/statistik');
    expect(await screen.findByText('Eine neue Version ist verfügbar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neu laden' })).toBeInTheDocument();
  });

  it('stays hidden when versions match', async () => {
    serve('0.3.0');
    renderApp('/statistik');
    await screen.findByRole('heading', { name: 'Statistik' });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Eine neue Version ist verfügbar.')).not.toBeInTheDocument();
  });
});
