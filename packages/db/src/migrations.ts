import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from './client.js';

export async function runMigrations(db: Database): Promise<void> {
  await db.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      executed_at timestamptz not null default now()
    );
  `);

  const srcDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.resolve(srcDir, '..', 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const alreadyRan = await db.query<{ filename: string }>(
      'select filename from schema_migrations where filename = $1',
      [file],
    );

    if (alreadyRan.rowCount > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await db.execScript(sql);
    await db.query('insert into schema_migrations(filename) values ($1)', [file]);
  }
}
