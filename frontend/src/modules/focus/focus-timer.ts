import { useCallback, useEffect, useState } from 'react';

/**
 * Focus timer start time, kept in localStorage so it survives closing the app.
 * Per device by design; nothing important is lost if storage is unavailable.
 */
const STORAGE_KEY = 'lifeos.focus.timerStart';

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(value: string | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore (private mode etc.)
  }
}

export function useFocusTimer() {
  const [startedAt, setStartedAt] = useState<string | null>(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const start = useCallback(() => {
    const iso = new Date().toISOString();
    write(iso);
    setStartedAt(iso);
    setNow(Date.now());
  }, []);

  const clear = useCallback(() => {
    write(null);
    setStartedAt(null);
  }, []);

  const elapsedMs = startedAt ? Math.max(0, now - Date.parse(startedAt)) : 0;
  return { startedAt, elapsedMs, start, clear };
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}
