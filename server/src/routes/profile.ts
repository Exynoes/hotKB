import { Router } from 'express';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { raceResults, races, roomParticipants, textes, users } from '../schema.js';
import { firstError } from '../schemas.js';

/**
 * AUTH-06 — statistiques personnelles ; HIST-01 — historique paginé.
 * Réservé aux comptes (un invité n'a pas d'historique persistant, AUTH-03).
 */
const router = Router();
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.auth?.kind !== 'user') {
    return res.status(403).json({ error: 'Un compte est nécessaire pour consulter ses statistiques.' });
  }
  next();
});

/** Résultats de courses du joueur (jointure résultat → participant → course). */
function resultsOf(userId: string) {
  return db
    .select({
      raceId: races.id,
      startedAt: races.startedAt,
      wpm: raceResults.wpm,
      accuracy: raceResults.accuracy,
      rank: raceResults.rank,
      errors: raceResults.errorsCount,
      language: textes.language,
    })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(raceResults.participantId, roomParticipants.id))
    .innerJoin(races, eq(raceResults.raceId, races.id))
    .innerJoin(textes, eq(races.texteId, textes.id))
    .where(eq(roomParticipants.userId, userId));
}

router.get('/profile', async (req, res) => {
  const userId = req.auth!.sub;
  const [user] = await db
    .select({ username: users.username, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });

  const rows = await resultsOf(userId).orderBy(asc(races.startedAt));
  const wpms = rows.map((r) => r.wpm ?? 0);
  const accuracies = rows.map((r) => r.accuracy ?? 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  res.json({
    username: user.username,
    avatarUrl: user.avatarUrl,
    stats: {
      races: rows.length,
      wins: rows.filter((r) => r.rank === 1).length,
      bestWpm: wpms.length ? Math.max(...wpms) : 0,
      avgWpm: Math.round(avg(wpms) * 10) / 10,
      avgAccuracy: Math.round(avg(accuracies) * 10) / 10,
    },
    progression: rows.map((r) => ({ date: r.startedAt, wpm: r.wpm ?? 0 })),
  });
});

const historyQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});

router.get('/history', async (req, res) => {
  const parsed = historyQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  const { page, pageSize } = parsed.data;
  const userId = req.auth!.sub;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(raceResults.participantId, roomParticipants.id))
    .where(and(eq(roomParticipants.userId, userId)));

  const items = await resultsOf(userId)
    .orderBy(desc(races.startedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({ page, pageSize, total, items });
});

export default router;
