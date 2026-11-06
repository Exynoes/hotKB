import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import {
  guestSessions,
  keyErrorStats,
  raceResults,
  races,
  roomParticipants,
  rooms as roomsTable,
  textes,
  users,
} from '../schema.js';
import type { Passage } from '../race/text.js';
import type { BotLevel } from '../race/bots.js';
import type { RaceResults, ResultPlayer } from './types.js';

export function avatarUrlFor(userId: string, updatedAt: Date | null): string | null {
  return updatedAt ? `/api/avatars/${userId}?v=${updatedAt.getTime()}` : null;
}

/** Résout le nom d'affichage et l'avatar d'un compte (AUTH-05 : pseudonyme modifiable). */
export async function userDisplay(userId: string): Promise<{ name: string; avatarUrl: string | null } | null> {
  const [u] = await db
    .select({ username: users.username, displayName: users.displayName, updatedAt: users.avatarUpdatedAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!u) return null;
  return { name: u.displayName ?? u.username, avatarUrl: avatarUrlFor(userId, u.updatedAt) };
}

let passageCache: { at: number; list: Passage[] } | null = null;

export async function loadPassages(): Promise<Passage[]> {
  if (passageCache && Date.now() - passageCache.at < 60_000) return passageCache.list;
  const rows = await db
    .select({ id: textes.id, content: textes.content, language: textes.language, complexity: textes.complexity })
    .from(textes);
  passageCache = { at: Date.now(), list: rows };
  return rows;
}

/** Records personnels antérieurs d'un compte (RES-04) : meilleur MPM sur les courses non abandonnées. */
export async function previousBest(userId: string): Promise<{ count: number; best: number }> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int`, best: sql<number>`coalesce(max(${raceResults.wpm}), 0)::float` })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(roomParticipants.id, raceResults.participantId))
    .where(and(eq(roomParticipants.userId, userId), sql`${raceResults.status} <> 'abandon'`));
  return { count: row?.count ?? 0, best: row?.best ?? 0 };
}

export interface SaveRaceInput {
  raceId: string;
  startedAt: Date;
  durationMs: number;
  status: 'terminee' | 'annulee';
  results: {
    participantId: string;
    userId: string | null;
    wpm: number;
    rawWpm: number;
    accuracy: number;
    rank: number;
    errors: number;
    timeMs: number | null;
    status: 'termine' | 'temps_ecoule' | 'abandon';
    progress: number;
    bonuses: unknown[];
    series: unknown[];
    keyErrors: Record<string, number>;
    personalRecord: boolean;
  }[];
}

/** RES-05 : persiste les résultats d'une course (une seule transaction, jamais à chaque frappe — PERF-02). */
export async function saveRace(input: SaveRaceInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(races)
      .set({ status: input.status, durationSeconds: Math.round(input.durationMs / 1000), startedAt: input.startedAt })
      .where(eq(races.id, input.raceId));
    if (input.results.length > 0) {
      await tx.insert(raceResults).values(
        input.results.map((r) => ({
          raceId: input.raceId,
          participantId: r.participantId,
          wpm: r.wpm,
          rawWpm: r.rawWpm,
          accuracy: r.accuracy,
          rank: r.rank,
          errorsCount: r.errors,
          timeMs: r.timeMs,
          status: r.status,
          progress: r.progress,
          bonuses: r.bonuses,
          wpmSeries: r.series,
          keyErrors: r.keyErrors,
          personalRecord: r.personalRecord,
        })),
      );
    }
    for (const r of input.results) {
      if (!r.userId) continue;
      for (const [char, count] of Object.entries(r.keyErrors)) {
        await tx
          .insert(keyErrorStats)
          .values({ userId: r.userId, keyChar: char.slice(0, 4), errorCount: count })
          .onConflictDoUpdate({
            target: [keyErrorStats.userId, keyErrorStats.keyChar],
            set: { errorCount: sql`${keyErrorStats.errorCount} + ${count}` },
          });
      }
    }
  });
}

/** Charge une course et ses résultats complets (HIST-02 et écran des résultats : même forme de données). */
export async function loadRaceResults(raceId: string): Promise<RaceResults | null> {
  const [race] = await db
    .select({
      id: races.id,
      startedAt: races.startedAt,
      durationSeconds: races.durationSeconds,
      language: races.language,
      textContent: races.textContent,
      settings: races.settings,
      texteContent: textes.content,
      roomCode: roomsTable.code,
    })
    .from(races)
    .innerJoin(roomsTable, eq(roomsTable.id, races.roomId))
    .leftJoin(textes, eq(textes.id, races.texteId))
    .where(eq(races.id, raceId));
  if (!race) return null;

  const rows = await db
    .select({
      r: raceResults,
      p: roomParticipants,
      username: users.username,
      displayName: users.displayName,
      avatarUpdatedAt: users.avatarUpdatedAt,
      guestName: guestSessions.displayName,
    })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(roomParticipants.id, raceResults.participantId))
    .leftJoin(users, eq(users.id, roomParticipants.userId))
    .leftJoin(guestSessions, eq(guestSessions.id, roomParticipants.guestId))
    .where(eq(raceResults.raceId, raceId));

  const players: ResultPlayer[] = rows
    .map(({ r, p, username, displayName, avatarUpdatedAt, guestName }) => {
      const kind = p.isBot ? 'bot' : p.userId ? 'user' : 'guest';
      return {
        id: p.id,
        name: p.isBot ? (p.botName ?? 'Bot') : kind === 'user' ? (displayName ?? username ?? '?') : (guestName ?? '?'),
        kind,
        botLevel: (p.botDifficulty as BotLevel | null) ?? null,
        avatarUrl: p.userId ? avatarUrlFor(p.userId, avatarUpdatedAt) : null,
        userId: p.userId,
        rank: r.rank ?? 0,
        status: r.status as ResultPlayer['status'],
        wpm: r.wpm ?? 0,
        rawWpm: r.rawWpm ?? 0,
        accuracy: r.accuracy ?? 0,
        errors: r.errorsCount,
        timeMs: r.timeMs,
        progress: r.progress,
        bonuses: r.bonuses as ResultPlayer['bonuses'],
        series: r.wpmSeries as ResultPlayer['series'],
        keyErrors: r.keyErrors as Record<string, number>,
        personalRecord: r.personalRecord,
      } satisfies ResultPlayer;
    })
    .sort((a, b) => a.rank - b.rank);

  return {
    raceId: race.id,
    roomCode: race.roomCode,
    startedAt: (race.startedAt ?? new Date()).toISOString(),
    durationMs: (race.durationSeconds ?? 0) * 1000,
    language: race.language ?? 'fr',
    text: race.textContent ?? race.texteContent ?? '',
    settings: race.settings as RaceResults['settings'],
    players,
  };
}

/** Une personne a-t-elle pris part à cette course ? (contrôle d'accès à la page de résultats). */
export async function tookPartIn(raceId: string, auth: { kind: 'user' | 'guest'; sub: string }): Promise<boolean> {
  const idCol = auth.kind === 'user' ? roomParticipants.userId : roomParticipants.guestId;
  const rows = await db
    .select({ id: raceResults.id })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(roomParticipants.id, raceResults.participantId))
    .where(and(eq(raceResults.raceId, raceId), eq(idCol, auth.sub)))
    .limit(1);
  return rows.length > 0;
}

