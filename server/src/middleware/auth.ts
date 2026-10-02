import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AuthPayload {
  sub: string;
  kind: 'user' | 'guest';
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Exige un jeton valide (compte ou invité) — AUTH-1/AUTH-3. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const token = header.slice('Bearer '.length);
    req.auth = jwt.verify(token, env.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Jeton invalide ou expiré.' });
  }
}
