import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/hotkb'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  /** URL publique du site (sert à construire l'URL de rappel OAuth). */
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:4000',
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    },
  },
  /** Décompte avant la course (COURSE-03) et délai de reconnexion (COURSE-08), réglables pour les tests. */
  get countdownMs() {
    return Number(process.env.COUNTDOWN_MS ?? 3000);
  },
  get reconnectGraceMs() {
    return Number(process.env.RECONNECT_GRACE_MS ?? 30000);
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
