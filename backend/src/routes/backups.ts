import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { exportDatabase, getBackupStatus, restoreDatabase } from '../core/backup.ts';
import { problems } from '../lib/problem.ts';
import { requireAuth } from '../middleware/require-auth.ts';
import type { AppEnv } from '../types.ts';

const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

export const backupRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/status', (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(getBackupStatus(c.var.services.handle));
  })
  .get('/download', async (c) => {
    const now = new Date();
    const bytes = await exportDatabase(c.var.services.handle, now);
    const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
    c.header('Content-Type', 'application/vnd.sqlite3');
    c.header('Content-Disposition', `attachment; filename="lifeos-backup-${stamp}.db"`);
    c.header('Cache-Control', 'no-store');
    return c.body(new Uint8Array(bytes), 200);
  })
  .post(
    '/restore',
    bodyLimit({
      maxSize: MAX_BACKUP_BYTES,
      onError: () => {
        throw problems.badRequest('Die Datei ist zu groß.');
      },
    }),
    async (c) => {
      const { handle, config, logger } = c.var.services;
      const bytes = new Uint8Array(await c.req.arrayBuffer());
      await restoreDatabase(handle, bytes, {
        migrationsDir: config.migrationsDir,
        snapshotDir: config.snapshotDir,
        logger,
      });
      return c.body(null, 204);
    },
  );
