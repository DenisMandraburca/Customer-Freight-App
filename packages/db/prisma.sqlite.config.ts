import path from 'node:path';

import { defineConfig } from 'prisma/config';

const defaultSqliteUrl = 'file:./data/dev.db';

function resolveSqliteUrl(): string {
  const raw = process.env.SQLITE_URL?.trim();
  if (raw) {
    return raw;
  }

  return defaultSqliteUrl;
}

export default defineConfig({
  schema: path.join('prisma', 'schema.sqlite.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: resolveSqliteUrl(),
  },
});
