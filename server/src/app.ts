import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { env } from './env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Construit l'application Express, séparée du serveur HTTP/Socket.IO pour
 * pouvoir être testée directement (voir server/test/auth.test.ts).
 */
export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  // En production, le serveur sert aussi le build du client (même origine,
  // un seul service à déployer — voir render.yaml).
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (env.nodeEnv === 'production' && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  return app;
}
