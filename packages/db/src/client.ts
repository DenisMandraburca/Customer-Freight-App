import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { Pool, type PoolConfig, type QueryResult } from 'pg';

export interface QueryResultLike<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface QueryExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResultLike<T>>;
}

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const hasWrappingDoubleQuotes = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
  const hasWrappingSingleQuotes = trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'");

  const unwrapped = hasWrappingDoubleQuotes || hasWrappingSingleQuotes ? trimmed.slice(1, -1).trim() : trimmed;

  return unwrapped || null;
}

function isSupabaseProjectUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return /^https?:$/i.test(parsed.protocol) && parsed.hostname.toLowerCase().endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function extractProjectRef(projectUrl: string): string {
  const parsed = new URL(projectUrl);
  const [projectRef] = parsed.hostname.split('.');

  if (!projectRef) {
    throw new Error('Could not determine Supabase project ref from SUPABASE_URL.');
  }

  return projectRef;
}

function buildSupabaseConnectionStringFromEnv(): string | null {
  const supabaseProjectUrl = trimToNull(process.env.SUPABASE_URL);
  const databaseUrlAsProjectUrl = trimToNull(process.env.DATABASE_URL);
  const projectUrlCandidate = supabaseProjectUrl ?? databaseUrlAsProjectUrl;

  if (!projectUrlCandidate || !isSupabaseProjectUrl(projectUrlCandidate)) {
    return null;
  }

  const password = trimToNull(process.env.SUPABASE_DB_PASSWORD);

  if (!password) {
    throw new Error(
      'SUPABASE_DB_PASSWORD is required when using SUPABASE_URL. Get it from Supabase Project Settings > Database.',
    );
  }

  const projectRef = extractProjectRef(projectUrlCandidate);
  const user = trimToNull(process.env.SUPABASE_DB_USER) ?? 'postgres';
  const host = trimToNull(process.env.SUPABASE_DB_HOST) ?? `db.${projectRef}.supabase.co`;
  const port = trimToNull(process.env.SUPABASE_DB_PORT) ?? '5432';
  const dbName = trimToNull(process.env.SUPABASE_DB_NAME) ?? 'postgres';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
}

function isValidPostgresConnectionString(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function isSupabaseConnectionString(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return hostname.includes('supabase.co') || hostname.includes('pooler.supabase.com');
  } catch {
    return false;
  }
}

function resolveDatabaseUrl(): string | null {
  // Prefer Supabase project-mode settings over legacy URI values.
  const supabaseConnection = buildSupabaseConnectionStringFromEnv();
  if (supabaseConnection) {
    return supabaseConnection;
  }

  const postgresCandidates = [trimToNull(process.env.DATABASE_URL), trimToNull(process.env.SUPABASE_DB_URL)];

  for (const candidate of postgresCandidates) {
    if (candidate && isValidPostgresConnectionString(candidate)) {
      return candidate;
    }
  }

  for (const candidate of postgresCandidates) {
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function resolveSslConfig(connectionString: string): PoolConfig['ssl'] | undefined {
  const value = process.env.PGSSL?.trim().toLowerCase();

  if (!value && isSupabaseConnectionString(connectionString)) {
    // Supabase requires SSL. Default to SSL for convenience when no PGSSL override is set.
    return { rejectUnauthorized: false };
  }

  if (!value) {
    return undefined;
  }

  if (['true', '1', 'require'].includes(value)) {
    return { rejectUnauthorized: false };
  }

  if (['false', '0', 'disable'].includes(value)) {
    return false;
  }

  return undefined;
}

function toRowCount(result: QueryResult | { rowCount?: number | null; rows?: unknown[]; affectedRows?: number }): number {
  const rowsLength = Array.isArray(result.rows) ? result.rows.length : 0;

  if (typeof result.rowCount === 'number') {
    if (result.rowCount === 0 && rowsLength > 0) {
      return rowsLength;
    }
    return result.rowCount;
  }

  if ('affectedRows' in result && typeof result.affectedRows === 'number' && rowsLength === 0) {
    return result.affectedRows;
  }

  return rowsLength;
}

export class Database implements QueryExecutor {
  private readonly pool?: Pool;
  private readonly pglite?: PGlite;
  private readonly isRemote: boolean;
  private txQueue: Promise<void> = Promise.resolve();

  private constructor(options: { pool?: Pool; pglite?: PGlite; isRemote: boolean }) {
    this.pool = options.pool;
    this.pglite = options.pglite;
    this.isRemote = options.isRemote;
  }

  static async create(): Promise<Database> {
    const databaseUrl = resolveDatabaseUrl();

    if (databaseUrl && /^https?:\/\//i.test(databaseUrl)) {
      throw new Error(
        'Invalid DB connection string. Use SUPABASE_URL + SUPABASE_DB_PASSWORD, or a postgres URI in DATABASE_URL/SUPABASE_DB_URL.',
      );
    }

    if (databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl)) {
      const ssl = resolveSslConfig(databaseUrl);
      const pool = new Pool({
        connectionString: databaseUrl,
        ...(ssl !== undefined ? { ssl } : {}),
      });

      return new Database({ pool, isRemote: true });
    }

    const explicitLocalDir = process.env.PGLITE_DATA_DIR;

    if (explicitLocalDir === ':memory:') {
      const pglite = new PGlite();
      return new Database({ pglite, isRemote: false });
    }

    const srcDir = path.dirname(fileURLToPath(import.meta.url));
    const packageRoot = path.resolve(srcDir, '..');
    const localDataDir = explicitLocalDir
      ? path.resolve(explicitLocalDir)
      : path.join(packageRoot, 'data', 'local');

    await fs.mkdir(localDataDir, { recursive: true });

    const pglite = new PGlite(localDataDir);

    return new Database({ pglite, isRemote: false });
  }

  get remote(): boolean {
    return this.isRemote;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResultLike<T>> {
    if (this.pool) {
      const result = await this.pool.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: toRowCount(result),
      };
    }

    if (!this.pglite) {
      throw new Error('Database client is not initialized.');
    }

    const result = await this.pglite.query<T>(sql, params);

    return {
      rows: (result.rows ?? []) as T[],
      rowCount: toRowCount(result),
    };
  }

  async execScript(sql: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(sql);
      return;
    }

    if (!this.pglite) {
      throw new Error('PGlite client is not initialized.');
    }

    await this.pglite.exec(sql);
  }

  async withTransaction<T>(handler: (tx: QueryExecutor) => Promise<T>): Promise<T> {
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('begin');

        const tx: QueryExecutor = {
          query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
            const result = await client.query(sql, params);
            return {
              rows: result.rows as R[],
              rowCount: toRowCount(result),
            };
          },
        };

        const value = await handler(tx);
        await client.query('commit');
        return value;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    }

    if (!this.pglite) {
      throw new Error('PGlite client is not initialized.');
    }

    let releaseLock: (() => void) | undefined;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = this.txQueue;
    this.txQueue = previousLock.then(() => currentLock);

    await previousLock;

    const tx: QueryExecutor = {
      query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await this.pglite!.query<R>(sql, params);
        return {
          rows: (result.rows ?? []) as R[],
          rowCount: toRowCount(result),
        };
      },
    };

    try {
      await tx.query('begin');
      const value = await handler(tx);
      await tx.query('commit');
      return value;
    } catch (error) {
      await tx.query('rollback');
      throw error;
    } finally {
      releaseLock?.();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }

    if (this.pglite) {
      await this.pglite.close();
    }
  }
}

let singleton: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!singleton) {
    singleton = await Database.create();
  }

  return singleton;
}

export async function closeDb(): Promise<void> {
  if (!singleton) {
    return;
  }

  await singleton.close();
  singleton = null;
}
