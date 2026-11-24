import fs from 'node:fs';
import path from 'node:path';
import type { MiddlewareHandler } from 'hono';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serves the built frontend with an SPA fallback to index.html.
 * Hashed assets (/assets/*) are cached forever; index.html, the service worker and
 * the manifest must always be revalidated so updates reach installed PWAs.
 */
export function staticFiles(rootDir: string): MiddlewareHandler {
  const root = path.resolve(rootDir);
  const indexFile = path.join(root, 'index.html');

  return async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next();
    if (c.req.path.startsWith('/api/')) return next();

    let relative: string;
    try {
      relative = decodeURIComponent(c.req.path);
    } catch {
      return next();
    }
    const candidate = path.resolve(root, `.${relative}`);
    if (candidate !== root && !candidate.startsWith(root + path.sep)) return next();

    let file = candidate;
    let stat = fs.statSync(file, { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      // Unknown file with an extension → 404; otherwise it is a client-side route.
      if (path.extname(relative)) return next();
      file = indexFile;
      stat = fs.statSync(file, { throwIfNoEntry: false });
      if (!stat?.isFile()) return next();
    }

    const ext = path.extname(file);
    const immutable = relative.startsWith('/assets/');
    c.header('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    c.header('Content-Length', String(stat.size));
    c.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    if (c.req.method === 'HEAD') return c.body(null, 200);
    return c.body(fs.readFileSync(file), 200);
  };
}
