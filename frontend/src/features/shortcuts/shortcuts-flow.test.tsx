import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waterConfigSchema } from '@lifeos/shared';
import { createFakeBackend, tracker, widget } from '@/test/fake-backend';
import { renderApp } from '@/test/render';

afterEach(() => vi.unstubAllGlobals());

function backend() {
  return createFakeBackend(
    [
      tracker('water', 'water', 'Wasser', waterConfigSchema.parse({})),
      tracker('mood', 'mood', 'Stimmung'),
    ],
    [widget('water.progress', 'water'), widget('mood.today', 'mood')],
  );
}

describe('home-screen shortcuts', () => {
  it('records water immediately, once, and cleans the URL', async () => {
    const b = backend();
    const { router } = renderApp('/?aktion=eintragen&tracker=water&wert=250');
    await waitFor(() => expect(b.entries()).toHaveLength(1));
    expect(b.entries()[0]).toMatchObject({ trackerId: 'water', value: 250, source: 'manual' });
    expect(await screen.findByText('Wasser eingetragen')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await new Promise((r) => setTimeout(r, 300));
    expect(b.entries()).toHaveLength(1);
  });

  it('opens the entry sheet of a tracker', async () => {
    backend();
    renderApp('/?aktion=oeffnen&tracker=mood');
    expect(await screen.findByRole('dialog', { name: 'Stimmung' })).toBeInTheDocument();
  });

  it('opens the quick-add sheet', async () => {
    backend();
    renderApp('/?aktion=erfassen');
    expect(await screen.findByRole('dialog', { name: 'Schnell erfassen' })).toBeInTheDocument();
  });

  it('ignores unknown trackers', async () => {
    const b = backend();
    renderApp('/?aktion=eintragen&tracker=unknown&wert=1');
    await screen.findAllByRole('button', { name: /Details öffnen$/ });
    await new Promise((r) => setTimeout(r, 200));
    expect(b.entries()).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
