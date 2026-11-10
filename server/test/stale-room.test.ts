import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { eq } from 'drizzle-orm';
import { db } from '../src/db.js';
import { roomParticipants, rooms } from '../src/schema.js';
import { client, emitAck, registerUser, startRealtime } from './helpers.js';

type Ack = { ok: boolean; error?: string; state?: { code: string } };

describe('reste de salle après redémarrage (SALLE-06)', () => {
  let rt: Awaited<ReturnType<typeof startRealtime>>;
  const sockets: Socket[] = [];
  beforeAll(async () => { rt = await startRealtime(); });
  afterAll(async () => { sockets.forEach((s) => s.close()); await rt.close(); });

  it("une participation « active » en base mais absente de la mémoire ne bloque plus la personne", async () => {
    const u = await registerUser('stale');
    // reste d'un ancien processus : salle et participation actives en base, rien en mémoire
    const [old] = await db.insert(rooms).values({ code: Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X'), visibility: 'open', hostUserId: u.id, status: 'en_attente' }).returning({ id: rooms.id });
    await db.insert(roomParticipants).values({ roomId: old.id, userId: u.id });

    const s = client(rt.url, u.token);
    sockets.push(s);
    const res = await emitAck<Ack>(s, 'room:create', {});
    expect(res.ok).toBe(true);
    const rows = await db.select().from(roomParticipants).where(eq(roomParticipants.roomId, old.id));
    expect(rows[0].leftAt).not.toBeNull();
  });
});
