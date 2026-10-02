import { io, type Socket } from 'socket.io-client';

/**
 * Client Socket.IO partagé pour toute l'application.
 * En dev, Vite proxy /socket.io vers le serveur (voir vite.config.ts).
 * En prod, le client et le serveur sont servis depuis la même origine.
 */
export const socket: Socket = io({
  autoConnect: false,
  transports: ['websocket'],
});
