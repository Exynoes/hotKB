import type { Server, Socket } from 'socket.io';
import type { ZodType } from 'zod';
import { botSchema, createRoomSchema, idSchema, joinAnySchema, keysSchema, roleSchema } from '../schemas.js';
import { RoomManager } from './manager.js';

type Ack = (res: unknown) => void;
const INVALID = { ok: false, error: 'INVALID_INPUT' } as const;

let manager: RoomManager | null = null;
export function getManager(): RoomManager | null {
  return manager;
}

/** Valide le message (TECH-07) puis délègue au gestionnaire de salles. */
function guarded<T>(schema: ZodType<T>, handler: (data: T, ack?: Ack) => unknown) {
  return (payload: unknown, ack?: Ack) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return typeof ack === 'function' ? ack(INVALID) : undefined;
    return handler(parsed.data, typeof ack === 'function' ? ack : undefined);
  };
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  manager ??= new RoomManager(io);
  const m = manager;
  const ackOnly = (fn: (ack?: Ack) => unknown) => (a?: unknown, b?: unknown) => fn(typeof a === 'function' ? (a as Ack) : typeof b === 'function' ? (b as Ack) : undefined);

  socket.on('room:create', guarded(createRoomSchema, (data, ack) => m.create(socket, data, ack)));
  socket.on('room:join', guarded(joinAnySchema, (data, ack) => m.join(socket, data, ack)));
  socket.on('room:quick', ackOnly((ack) => m.quick(socket, ack)));
  socket.on('room:resume', ackOnly((ack) => m.resume(socket, ack)));
  socket.on('room:leave', () => void m.leave(socket));
  socket.on('room:start', ackOnly((ack) => m.start(socket, ack)));
  socket.on('room:close', ackOnly((ack) => m.close(socket, ack)));
  socket.on('room:lobby', ackOnly((ack) => m.backToLobby(socket, ack)));
  socket.on('room:rematch', ackOnly((ack) => m.rematch(socket, ack)));
  socket.on('room:role', guarded(roleSchema, (data, ack) => m.setRole(socket, data, ack)));
  socket.on('settings:update', (payload: unknown, ack?: Ack) => m.updateSettings(socket, payload, typeof ack === 'function' ? ack : undefined));
  socket.on('bot:add', guarded(botSchema, (data, ack) => m.addBot(socket, data, ack)));
  socket.on('bot:remove', guarded(idSchema, (data, ack) => m.removeBot(socket, data, ack)));
  socket.on('member:kick', guarded(idSchema, (data, ack) => m.kick(socket, data, ack)));
  socket.on('invite:create', ackOnly((ack) => m.createInvite(socket, ack)));
  socket.on('invite:revoke', guarded(idSchema, (data, ack) => m.revokeInvite(socket, data, ack)));
  socket.on('race:keys', (payload: unknown) => {
    const parsed = keysSchema.safeParse(payload);
    if (parsed.success) m.keys(socket, parsed.data);
  });
  socket.on('race:abandon', ackOnly((ack) => m.abandon(socket, ack)));

  socket.on('explorer:subscribe', (ack?: Ack) => {
    void socket.join('explorer');
    if (typeof ack === 'function') ack({ ok: true, rooms: m.listPublic() });
  });
  socket.on('explorer:unsubscribe', () => void socket.leave('explorer'));

  socket.on('disconnect', () => m.onDisconnect(socket));
}
