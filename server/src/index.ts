import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { pool } from './db.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import { registerRoomHandlers } from './rooms/handlers.js';
import type { AuthPayload } from './middleware/auth.js';

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

const httpServer = createServer(app);

// Socket.IO : choix documenté dans architecture.html, ADR-001.
export const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin },
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

httpServer.listen(env.port, () => {
  console.log(`[server] HotKB API + WebSocket à l'écoute sur le port ${env.port}`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
