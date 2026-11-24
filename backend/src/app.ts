import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { API_PREFIX } from '@lifeos/shared';
import { HttpProblem, problemResponse, problems } from './lib/problem.ts';
import { staticFiles } from './lib/static-files.ts';
import { originCheck } from './middleware/origin-check.ts';
import { requestLog } from './middleware/request-log.ts';
import { authRoutes } from './routes/auth.ts';
import { backupRoutes } from './routes/backups.ts';
import { healthRoutes } from './routes/health.ts';
import { dayRoutes, entryRoutes, settingsRoutes, trackerRoutes } from './routes/tracking.ts';
import type { AppEnv, AppServices } from './types.ts';

export function createApp(services: AppServices) {
  const app = new Hono<AppEnv>();

  app.use(async (c, next) => {
    c.set('services', services);
    await next();
  });
  app.use(requestLog());
  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
      referrerPolicy: 'no-referrer',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
      // HSTS is pointless on localhost and set by nothing else; harmless on *.ts.net.
      strictTransportSecurity: services.config.cookieSecure ? 'max-age=31536000' : false,
    }),
  );

  const api = new Hono<AppEnv>()
    .use(originCheck())
    .route('/health', healthRoutes)
    .route('/auth', authRoutes)
    .route('/settings', settingsRoutes)
    .route('/trackers', trackerRoutes)
    .route('/entries', entryRoutes)
    .route('/days', dayRoutes)
    .route('/backups', backupRoutes);

  app.route(API_PREFIX, api);
  app.all(`${API_PREFIX}/*`, () => {
    throw problems.notFound();
  });

  if (services.config.staticDir) app.use(staticFiles(services.config.staticDir));

  app.notFound((c) => problemResponse(c, problems.notFound()));
  app.onError((err, c) => {
    if (err instanceof HttpProblem) return problemResponse(c, err);
    // Malformed JSON bodies etc. from Hono itself
    if ('status' in err && err.status === 400) return problemResponse(c, problems.badRequest());
    services.logger.error(
      { err: { name: err.name, message: err.message, stack: err.stack } },
      'unhandled error',
    );
    return problemResponse(c, new HttpProblem(500, 'Internal Server Error'));
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
