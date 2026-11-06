import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { registerRoomHandlers } from './rooms/handlers.js';
import type { AuthPayload } from './middleware/auth.js';

/** Serveur Socket.IO (ADR-001) : authentifie chaque connexion avec le même jeton JWT que l'API REST. */
export function createRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin },
    destroyUpgrade: false, // laisse passer le WebSocket de rechargement à chaud de Next en dev
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') return next(new Error('AUTH_REQUIRED'));
    try {
      socket.data.auth = jwt.verify(token, env.jwtSecret) as AuthPayload;
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
  });
  return io;
}
