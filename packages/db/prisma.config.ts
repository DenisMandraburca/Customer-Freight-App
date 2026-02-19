import path from 'node:path';

import { defineConfig } from 'prisma/config';

function resolveDatasourceUrl(): string {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: resolveDatasourceUrl(),
  },
});
