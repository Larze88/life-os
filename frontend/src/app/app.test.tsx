import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';

type Handler = (init: RequestInit | undefined) => Response;

function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler)
      return new Response(JSON.stringify({ title: 'Not Found', status: 404 }), { status: 404 });
    return handler(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('app shell', () => {
  it('sends first-time users to the setup page', async () => {
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: true, authenticated: false }),
    });
    const { router } = renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Life OS einrichten' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/einrichtung');
  });

  it('validates the setup form locally', async () => {
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: true, authenticated: false }),
    });
    renderApp('/einrichtung');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Passwort'), 'langes-passwort');
    await user.type(screen.getByLabelText('Passwort wiederholen'), 'anderes-passwort');
    await user.click(screen.getByRole('button', { name: 'Passwort festlegen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('stimmen nicht überein');
  });

  it('shows a helpful message for a wrong password', async () => {
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: false }),
      'POST /api/v1/auth/login': () => json({ title: 'Unauthorized', status: 401 }, 401),
    });
    const { router } = renderApp('/statistik');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Passwort'), 'falsch');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Das Passwort ist falsch.');
    expect(router.state.location.pathname).toBe('/anmelden');
  });

  it('logs in and returns to the requested page', async () => {
    let authenticated = false;
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated }),
      'POST /api/v1/auth/login': () => {
        authenticated = true;
        return new Response(null, { status: 204 });
      },
    });
    const { router } = renderApp('/statistik');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Passwort'), 'richtiges-passwort');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/statistik'));
    expect(await screen.findByRole('heading', { name: 'Statistik' })).toBeInTheDocument();
  });

  it('renders the navigation for signed-in users', async () => {
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated: true }),
    });
    renderApp('/');
    const navs = await screen.findAllByRole('navigation', { name: 'Hauptnavigation' });
    expect(navs.length).toBeGreaterThan(0);
    for (const label of ['Heute', 'Verlauf', 'Statistik', 'Einstellungen']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
  });

  it('logs out from the settings page', async () => {
    let authenticated = true;
    mockApi({
      'GET /api/v1/auth/status': () => json({ setupRequired: false, authenticated }),
      'GET /api/v1/auth/sessions': () => json([]),
      'GET /api/v1/health': () => json({ status: 'ok', version: '0.1.0' }),
      'POST /api/v1/auth/logout': () => {
        authenticated = false;
        return new Response(null, { status: 204 });
      },
    });
    const { router } = renderApp('/einstellungen');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Abmelden' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/anmelden'));
  });

  it('offers a retry when the server is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    renderApp('/');
    expect(
      await screen.findByText('Keine Verbindung zum Server.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
