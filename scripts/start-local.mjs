// Starts the production build locally (API + frontend on one port), e.g. for
// phone access through `tailscale serve`. Uses the same database as `npm run dev`.
// Cross-platform on purpose: no shell-specific env syntax (Windows/PowerShell).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const server = path.join(root, 'backend', 'dist', 'server.js');
const staticDir = path.join(root, 'frontend', 'dist');

if (!fs.existsSync(server) || !fs.existsSync(path.join(staticDir, 'index.html'))) {
  console.error('Build fehlt – bitte zuerst "npm run build" ausführen (oder "npm run phone").');
  process.exit(1);
}

const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: process.env.PORT ?? '8080',
    STATIC_DIR: staticDir,
  },
});

console.error(`
  Life OS läuft auf http://localhost:${process.env.PORT ?? '8080'}
  Für das Handy in einem zweiten Fenster einmalig:  tailscale serve --bg ${process.env.PORT ?? '8080'}
  Beenden mit Strg+C.
`);

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
