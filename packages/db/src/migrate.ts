import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { closeDb, getDb } from './client.js';
import { runMigrations } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(workspaceRoot, '.env') });

async function main(): Promise<void> {
  const db = await getDb();
  // eslint-disable-next-line no-console
  console.log(
    db.remote
      ? 'Running migrations against remote DB (SUPABASE_URL mode or DATABASE_URL/SUPABASE_DB_URL URI mode).'
      : 'Running migrations against local PGlite (set SUPABASE_URL + SUPABASE_DB_PASSWORD or DATABASE_URL/SUPABASE_DB_URL).',
  );
  await runMigrations(db);
  await closeDb();
  // eslint-disable-next-line no-console
  console.log('Migrations completed successfully.');
}

main().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  await closeDb();
  process.exit(1);
});
