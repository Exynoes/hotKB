import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { env } from './env.js';
import { pool } from './db.js';
import { createApp } from './app.js';
import { createRealtime } from './realtime.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dev = env.nodeEnv !== 'production';

// TECH-01 : Next.js (App Router) sert les pages ; l'API REST et Socket.IO vivent dans
// le même processus (Socket.IO exige un serveur persistant, voir ADR-001).
const require = createRequire(import.meta.url);
// Next.js est un module CommonJS : on type uniquement la partie de l'API que l'on utilise.
const next = require('next') as (options: { dev: boolean; dir: string }) => {
  prepare(): Promise<void>;
  getRequestHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
const nextApp = next({ dev, dir: join(__dirname, '..', '..', 'client') });
const handleNext = nextApp.getRequestHandler();

const app = createApp();
app.all(/^\/(?!api|socket\.io).*/, (req, res) => handleNext(req, res));
const httpServer = createServer(app);

// Socket.IO : choix documenté dans docs/ARCHITECTURE.md, ADR-001.
export const io = createRealtime(httpServer);

nextApp.prepare().then(() => {
  httpServer.listen(env.port, () => {
    console.log(`[server] HotKB (Next.js + API + WebSocket) à l'écoute sur le port ${env.port}`);
  });
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
