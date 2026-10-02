import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

async function migrate() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`[migrate] exécution de ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
  }

  console.log('[migrate] terminé');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] échec', err);
  process.exit(1);
});
