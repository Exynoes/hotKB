import { io, type Socket } from 'socket.io-client';

/**
 * Client Socket.IO partagé pour toute l'application.
 * Next.js et Socket.IO sont servis par le même processus (server/src/index.ts) :
 * même origine en dev comme en production.
 */
export const socket: Socket = io({
  autoConnect: false,
  transports: ['websocket'],
});
