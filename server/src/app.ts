import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import oauthRouter from './routes/oauth.js';
import profileRouter from './routes/profile.js';

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
  app.use('/api/auth/oauth', oauthRouter);
  app.use('/api/me', profileRouter);

  return app;
}
