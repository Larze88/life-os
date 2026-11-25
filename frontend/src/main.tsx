import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { setupPwaUpdates } from './lib/pwa-update';
import './styles/index.css';

// Service worker caches the app shell only (ADR-010); updates apply automatically.
setupPwaUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
