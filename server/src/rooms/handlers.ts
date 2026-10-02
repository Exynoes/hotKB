import type { Server, Socket } from 'socket.io';
import { pool } from '../db.js';
import { generateRoomCode } from './code.js';
import type { AuthPayload } from '../middleware/auth.js';

interface Participant {
  participantId: string;
  socketId: string;
  displayName: string;
  isHost: boolean;
}

interface RoomState {
  roomId: string;
  code: string;
  status: 'en_attente' | 'en_course' | 'resultats' | 'fermee';
  hostSocketId: string;
  participants: Map<string, Participant>; // keyed by socketId
}

// État temps réel en mémoire, indexé par code de salle.
// La persistance (Room / RoomParticipant) se fait en base pour l'historique,
// mais la diffusion en direct passe par cette structure (voir ADR-001).
const rooms = new Map<string, RoomState>();

function publicState(room: RoomState) {
  return {
    code: room.code,
    status: room.status,
    participants: [...room.participants.values()].map((p) => ({
      id: p.participantId,
      displayName: p.displayName,
      isHost: p.isHost,
    })),
  };
}

function broadcast(io: Server, room: RoomState) {
  io.to(room.code).emit('room:state', publicState(room));
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  const auth = socket.data.auth as AuthPayload;

  socket.on('room:create', async (ack?: (res: unknown) => void) => {
    try {
      let code = generateRoomCode();
      // Évite une collision improbable avec une salle active.
      while (rooms.has(code)) code = generateRoomCode();

      const userId = auth.kind === 'user' ? auth.sub : null;
      const result = await pool.query(
        `INSERT INTO room (code, visibility, host_user_id, status)
         VALUES ($1, 'open', $2, 'en_attente') RETURNING id`,
        [code, userId],
      );
      const roomId = result.rows[0].id;

      const participantResult = await pool.query(
        `INSERT INTO room_participant (room_id, user_id, guest_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [roomId, auth.kind === 'user' ? auth.sub : null, auth.kind === 'guest' ? auth.sub : null],
      );
      const participantId = participantResult.rows[0].id;

      const room: RoomState = {
        roomId,
        code,
        status: 'en_attente',
        hostSocketId: socket.id,
        participants: new Map(),
      };
      room.participants.set(socket.id, {
        participantId,
        socketId: socket.id,
        displayName: auth.username,
        isHost: true,
      });
      rooms.set(code, room);

      socket.join(code);
      socket.data.roomCode = code;
      ack?.({ ok: true, state: publicState(room), youId: participantId });
    } catch (err) {
      console.error('[room:create] erreur', err);
      ack?.({ ok: false, error: 'Impossible de créer la salle.' });
    }
  });

  socket.on('room:join', async (payload: { code?: string }, ack?: (res: unknown) => void) => {
    try {
      const code = (payload?.code ?? '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) {
        return ack?.({ ok: false, error: "Aucune salle active avec ce code." });
      }
      if (room.status !== 'en_attente') {
        return ack?.({ ok: false, error: 'La course est déjà commencée.' });
      }

      const participantResult = await pool.query(
        `INSERT INTO room_participant (room_id, user_id, guest_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [room.roomId, auth.kind === 'user' ? auth.sub : null, auth.kind === 'guest' ? auth.sub : null],
      );
      const participantId = participantResult.rows[0].id;

      room.participants.set(socket.id, {
        participantId,
        socketId: socket.id,
        displayName: auth.username,
        isHost: false,
      });

      socket.join(code);
      socket.data.roomCode = code;
      ack?.({ ok: true, state: publicState(room), youId: participantId });
      broadcast(io, room);
    } catch (err) {
      console.error('[room:join] erreur', err);
      ack?.({ ok: false, error: 'Impossible de rejoindre la salle.' });
    }
  });

  socket.on('room:start', async (ack?: (res: unknown) => void) => {
    const code = socket.data.roomCode as string | undefined;
    const room = code ? rooms.get(code) : undefined;
    if (!room) return ack?.({ ok: false, error: 'Salle introuvable.' });
    if (room.hostSocketId !== socket.id) {
      return ack?.({ ok: false, error: "Seul l'hôte peut démarrer la course." });
    }
    // COURSE-1 : minimum 2 joueurs pour démarrer.
    if (room.participants.size < 2) {
      return ack?.({ ok: false, error: 'Il faut au moins 2 joueurs pour démarrer.' });
    }

    room.status = 'en_course';
    await pool.query('UPDATE room SET status = $1 WHERE id = $2', ['en_course', room.roomId]);
    ack?.({ ok: true });
    broadcast(io, room);
  });

  function leaveCurrentRoom() {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    room.participants.delete(socket.id);

    if (room.participants.size === 0) {
      rooms.delete(code);
      return;
    }

    // Si l'hôte part, l'hôte devient le participant restant le plus ancien.
    if (room.hostSocketId === socket.id) {
      const next = room.participants.values().next().value as Participant;
      next.isHost = true;
      room.hostSocketId = next.socketId;
    }

    broadcast(io, room);
  }

  socket.on('room:leave', leaveCurrentRoom);
  socket.on('disconnect', leaveCurrentRoom);
}
