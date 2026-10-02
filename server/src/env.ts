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
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
