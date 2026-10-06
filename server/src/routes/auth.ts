import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
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

  const existing = await pool.query('SELECT id FROM "user" WHERE username = $1', [username]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO "user" (username, password_hash, auth_provider)
     VALUES ($1, $2, 'local')
     RETURNING id, username, created_at`,
    [username, passwordHash],
  );
  const user = result.rows[0];

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

  const result = await pool.query(
    'SELECT id, username, password_hash FROM "user" WHERE username = $1',
    [username],
  );
  const user = result.rows[0];
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
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

  const result = await pool.query(
    `INSERT INTO guest_session (display_name) VALUES ($1) RETURNING id, display_name, created_at`,
    [displayName],
  );
  const guest = result.rows[0];

  const token = signToken({ sub: guest.id, kind: 'guest', username: guest.display_name });
  res.status(201).json({ token, guest: { id: guest.id, displayName: guest.display_name } });
});

/**
 * Retourne l'identité associée au jeton courant (compte ou invité).
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ auth: req.auth });
});

export default router;
