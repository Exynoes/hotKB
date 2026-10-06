import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { pool } from './db.js';
import { createApp } from './app.js';
import { registerRoomHandlers } from './rooms/handlers.js';
import type { AuthPayload } from './middleware/auth.js';

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

// Socket.IO : choix documenté dans architecture.html, ADR-001.
export const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin },
  destroyUpgrade: false, // laisse passer le WebSocket de rechargement à chaud de Next en dev
});

// Authentifie chaque connexion WebSocket avec le même jeton JWT que l'API REST.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string') {
    return next(new Error('Authentification requise.'));
  }
  try {
    socket.data.auth = jwt.verify(token, env.jwtSecret) as AuthPayload;
    next();
  } catch {
    next(new Error('Jeton invalide ou expiré.'));
  }
});

io.on('connection', (socket) => {
  console.log(`[socket] connecté : ${socket.id} (${socket.data.auth?.username})`);

  registerRoomHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] déconnecté : ${socket.id} (${reason})`);
  });
});

nextApp.prepare().then(() => {
  httpServer.listen(env.port, () => {
    console.log(`[server] HotKB (Next.js + API + WebSocket) à l'écoute sur le port ${env.port}`);
  });
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
