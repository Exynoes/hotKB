import { randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { env } from '../env.js';
import { users } from '../schema.js';

/**
 * AUTH-01 — Connexion OAuth avec Discord et GitHub (flux « authorization code »).
 * Un fournisseur n'est proposé que si ses identifiants sont configurés.
 * Le paramètre `state` est un JWT court lié à un cookie (protection CSRF).
 */

type Provider = 'github' | 'discord';

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  scope: string;
  profile: (data: Record<string, unknown>) => { id: string; name: string; avatar: string | null };
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'read:user',
    profile: (d) => ({
      id: String(d.id),
      name: String(d.login ?? 'github'),
      avatar: typeof d.avatar_url === 'string' ? d.avatar_url : null,
    }),
  },
  discord: {
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    scope: 'identify',
    profile: (d) => ({
      id: String(d.id),
      name: String(d.username ?? 'discord'),
      avatar: d.avatar ? `https://cdn.discordapp.com/avatars/${String(d.id)}/${String(d.avatar)}.png` : null,
    }),
  },
};

function isProvider(value: string): value is Provider {
  return value === 'github' || value === 'discord';
}

function isConfigured(provider: Provider) {
  const { clientId, clientSecret } = env.oauth[provider];
  return Boolean(clientId && clientSecret);
}

function redirectUri(provider: Provider) {
  return `${env.publicUrl}/api/auth/oauth/${provider}/callback`;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function failure(res: Response, reason: string) {
  res.redirect(`/#oauth_error=${encodeURIComponent(reason)}`);
}

/** Construit un nom d'utilisateur valide (3-20 caractères) et unique. */
async function uniqueUsername(base: string): Promise<string> {
  const clean = base.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20).padEnd(3, '_');
  let candidate = clean;
  for (let i = 0; i < 20; i++) {
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate));
    if (!taken) return candidate;
    candidate = `${clean.slice(0, 15)}_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `user_${randomBytes(4).toString('hex')}`;
}

const router = Router();

/** Fournisseurs disponibles (pour afficher les boutons côté client). */
router.get('/providers', (_req, res) => {
  res.json({ providers: (Object.keys(PROVIDERS) as Provider[]).filter(isConfigured) });
});

router.get('/:provider', (req, res) => {
  const provider = req.params.provider;
  if (!isProvider(provider) || !isConfigured(provider)) {
    return failure(res, 'provider_unavailable');
  }
  const nonce = randomBytes(16).toString('hex');
  const state = jwt.sign({ provider, nonce }, env.jwtSecret, { expiresIn: '10m' });
  res.cookie('oauth_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
  });
  const cfg = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: env.oauth[provider].clientId,
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  res.redirect(`${cfg.authorizeUrl}?${params.toString()}`);
});

router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  if (!isProvider(provider) || !isConfigured(provider)) return failure(res, 'provider_unavailable');

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateParam = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !stateParam) return failure(res, 'missing_params');

  try {
    const state = jwt.verify(stateParam, env.jwtSecret) as { provider: string; nonce: string };
    if (state.provider !== provider || state.nonce !== readCookie(req, 'oauth_nonce')) {
      return failure(res, 'invalid_state');
    }

    const cfg = PROVIDERS[provider];
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.oauth[provider].clientId,
        client_secret: env.oauth[provider].clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(provider),
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return failure(res, 'token_exchange_failed');

    const profileRes = await fetch(cfg.userUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'User-Agent': 'HotKB',
      },
    });
    const profile = cfg.profile((await profileRes.json()) as Record<string, unknown>);

    let [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.authProvider, provider), eq(users.providerId, profile.id)));
    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          username: await uniqueUsername(profile.name),
          authProvider: provider,
          providerId: profile.id,
          avatarUrl: profile.avatar,
        })
        .returning();
    }

    const token = jwt.sign({ sub: user.id, kind: 'user', username: user.username }, env.jwtSecret, {
      expiresIn: '30d',
    });
    res.clearCookie('oauth_nonce');
    // Le jeton est transmis dans le fragment (jamais envoyé au serveur ni journalisé).
    res.redirect(`/#token=${encodeURIComponent(token)}&name=${encodeURIComponent(user.username)}`);
  } catch (err) {
    console.error('[oauth] échec', err);
    failure(res, 'oauth_failed');
  }
});

export default router;
