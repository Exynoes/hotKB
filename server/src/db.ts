import { Pool } from 'pg';
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
