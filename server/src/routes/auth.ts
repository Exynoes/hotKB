import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { guestSessions, users } from '../schema.js';
import { env } from '../env.js';
import { requireAuth } from '../middleware/auth.js';
import { firstError, guestSchema, loginSchema, registerSchema } from '../schemas.js';

const router = Router();

function signToken(payload: { sub: string; kind: 'user' | 'guest'; username: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '30d' });
}

/**
 * AUTH-1 — Inscription par nom d'utilisateur + mot de passe, sans courriel.
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  const { username, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (existing) {
    return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash, authProvider: 'local' })
    .returning({ id: users.id, username: users.username });

  const token = signToken({ sub: user.id, kind: 'user', username: user.username });
  res.status(201).json({ token, user: { id: user.id, username: user.username } });
});

/**
 * Connexion par nom d'utilisateur + mot de passe.
 */
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
  }
  const { username, password } = parsed.data;

  const [user] = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username));
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  const token = signToken({ sub: user.id, kind: 'user', username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

/**
 * AUTH-3 — Jouer en tant qu'invité, sans compte.
 */
router.post('/guest', async (req, res) => {
  const parsed = guestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  const { displayName } = parsed.data;

  const [guest] = await db
    .insert(guestSessions)
    .values({ displayName })
    .returning({ id: guestSessions.id, displayName: guestSessions.displayName });

  const token = signToken({ sub: guest.id, kind: 'guest', username: guest.displayName });
  res.status(201).json({ token, guest: { id: guest.id, displayName: guest.displayName } });
});

/**
 * Retourne l'identité associée au jeton courant (compte ou invité).
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ auth: req.auth });
});

export default router;
