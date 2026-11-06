import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { users } from '../schema.js';

/** Sert la photo de profil d'un compte (public : elle s'affiche aux autres joueurs). */
const router = Router();

router.get('/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).end();
  const [row] = await db.select({ data: users.avatarData }).from(users).where(eq(users.id, id.data));
  if (!row?.data) return res.status(404).end();
  res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(row.data);
});

export default router;
