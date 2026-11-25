import { registerSW } from 'virtual:pwa-register';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Registers the service worker and actively looks for new versions.
 * An installed PWA on Android often stays alive in the background and is never
 * "reloaded", so we check when the app comes back to the foreground and periodically.
 * With registerType 'autoUpdate' a found update activates and reloads the page.
 */
export function setupPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, CHECK_INTERVAL_MS);
    },
  });
}
