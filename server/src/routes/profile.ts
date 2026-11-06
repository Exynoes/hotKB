import express, { Router } from 'express';
import sharp from 'sharp';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { raceResults, races, roomParticipants, textes, users } from '../schema.js';
import { firstError } from '../schemas.js';
import { avatarUrlFor } from '../rooms/persist.js';

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
      status: raceResults.status,
      personalRecord: raceResults.personalRecord,
      language: sql<string>`coalesce(${races.language}, ${textes.language}, 'fr')`,
    })
    .from(raceResults)
    .innerJoin(roomParticipants, eq(raceResults.participantId, roomParticipants.id))
    .innerJoin(races, eq(raceResults.raceId, races.id))
    .leftJoin(textes, eq(races.texteId, textes.id))
    .where(eq(roomParticipants.userId, userId));
}

router.get('/profile', async (req, res) => {
  const userId = req.auth!.sub;
  const [user] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      avatarUpdatedAt: users.avatarUpdatedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });

  const rows = await resultsOf(userId).orderBy(asc(races.startedAt));
  // un abandon ne compte pas dans les moyennes ni dans le meilleur MPM
  const played = rows.filter((r) => r.status !== 'abandon');
  const wpms = played.map((r) => r.wpm ?? 0);
  const accuracies = played.map((r) => r.accuracy ?? 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  res.json({
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: avatarUrlFor(userId, user.avatarUpdatedAt),
    stats: {
      races: played.length,
      wins: played.filter((r) => r.rank === 1).length,
      bestWpm: wpms.length ? Math.max(...wpms) : 0,
      avgWpm: Math.round(avg(wpms) * 10) / 10,
      avgAccuracy: Math.round(avg(accuracies) * 10) / 10,
    },
    progression: played.map((r) => ({ date: r.startedAt, wpm: r.wpm ?? 0 })),
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

/** AUTH-05 : nom affiché modifiable (distinct du nom d'utilisateur de connexion). */
const displayNameSchema = z.object({
  displayName: z.string().trim().min(2, 'Le nom doit avoir au moins 2 caractères.').max(20, 'Le nom ne peut pas dépasser 20 caractères.'),
});

router.patch('/display-name', async (req, res) => {
  const parsed = displayNameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  await db.update(users).set({ displayName: parsed.data.displayName }).where(eq(users.id, req.auth!.sub));
  res.json({ displayName: parsed.data.displayName });
});

/** Signatures de fichiers image acceptées (on ne se fie ni à l'extension ni au Content-Type). */
function looksLikeImage(b: Buffer) {
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const webp = b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
  return png || jpg || webp;
}

/** AUTH-04 : photo de profil (≤ 2 Mo, PNG/JPEG/WebP), redimensionnée en 256×256 WebP côté serveur. */
router.put('/avatar', express.raw({ type: () => true, limit: '2mb' }), async (req, res) => {
  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || body.length === 0 || !looksLikeImage(body)) {
    return res.status(400).json({ error: 'Image invalide (PNG, JPEG ou WebP, 2 Mo maximum).' });
  }
  let data: Buffer;
  try {
    data = await sharp(body, { limitInputPixels: 40_000_000 }).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
  } catch {
    return res.status(400).json({ error: 'Image invalide (PNG, JPEG ou WebP, 2 Mo maximum).' });
  }
  const now = new Date();
  await db.update(users).set({ avatarData: data, avatarUpdatedAt: now }).where(eq(users.id, req.auth!.sub));
  res.json({ avatarUrl: avatarUrlFor(req.auth!.sub, now) });
});

router.delete('/avatar', async (req, res) => {
  await db.update(users).set({ avatarData: null, avatarUpdatedAt: null }).where(eq(users.id, req.auth!.sub));
  res.json({ avatarUrl: null });
});

export default router;
