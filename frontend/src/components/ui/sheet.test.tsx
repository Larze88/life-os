import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBackend, tracker, widget } from '@/test/fake-backend';
import { renderApp } from '@/test/render';

afterEach(() => vi.unstubAllGlobals());

describe('sheets on phones', () => {
  it('open without focusing an input (no keyboard covering the buttons)', async () => {
    createFakeBackend([tracker('sleep', 'sleep', 'Schlaf')], [widget('sleep.last_night', 'sleep')]);
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Schlaf eintragen' }));
    const dialog = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    expect(document.activeElement?.tagName).not.toBe('INPUT');
  });
});
