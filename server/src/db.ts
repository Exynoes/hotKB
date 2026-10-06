import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { env } from './env.js';

/**
 * Pool de connexions PostgreSQL partagé.
 * Le schéma est défini dans migrations/001_init.sql (voir architecture.html).
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  console.error('[db] erreur inattendue sur une connexion idle', err);
});

/** ORM Drizzle (TECH-04) — requêtes typées sur le même pool. */
export const db = drizzle(pool, { schema });
