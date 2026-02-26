import fs from 'node:fs';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import SqliteDriver, { type Database as SqliteDatabaseDriver } from 'better-sqlite3';
import type { PoolConfig } from 'pg';

import { type DbDialect, resolveDbProvider, resolveSqliteFilePath } from './dbConfig.js';
import { normalizeSqliteQuery } from './sqlDialect.js';

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
  // Prefer Supabase project-mode settings over direct URI values.
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

function createPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL (or SUPABASE_URL + SUPABASE_DB_PASSWORD, or SUPABASE_DB_URL) is required for PostgreSQL mode.',
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://).');
  }

  const ssl = resolveSslConfig(databaseUrl);
  const connectionString =
    ssl === false
      ? databaseUrl
      : ssl
        ? `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`
        : databaseUrl;

  const adapter = new PrismaPg({
    connectionString,
    ...(typeof ssl === 'object' && ssl !== null && { ssl }),
  });
  return new PrismaClient({ adapter });
}

class PostgresDatabase implements QueryExecutor {
  readonly dialect: DbDialect = 'postgres';
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResultLike<T>> {
    const normalized = sql.trim().toLowerCase();
    const hasReturning = /\breturning\b/.test(normalized);
    const expectsRows = hasReturning || normalized.startsWith('select') || normalized.startsWith('with');

    if (expectsRows) {
      const rows = (await this.prisma.$queryRawUnsafe(sql, ...params)) as T[];
      return {
        rows: rows ?? [],
        rowCount: rows?.length ?? 0,
      };
    }

    const rowCount = Number(await this.prisma.$executeRawUnsafe(sql, ...params));
    return {
      rows: [],
      rowCount: Number.isFinite(rowCount) ? rowCount : 0,
    };
  }

  async execScript(sql: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(sql);
  }

  async withTransaction<T>(handler: (tx: QueryExecutor) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (txClient) => {
      const tx: QueryExecutor = {
        query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
          const normalized = sql.trim().toLowerCase();
          const hasReturning = /\breturning\b/.test(normalized);
          const expectsRows = hasReturning || normalized.startsWith('select') || normalized.startsWith('with');

          if (expectsRows) {
            const rows = (await txClient.$queryRawUnsafe(sql, ...params)) as R[];
            return {
              rows: rows ?? [],
              rowCount: rows?.length ?? 0,
            };
          }

          const rowCount = Number(await txClient.$executeRawUnsafe(sql, ...params));
          return {
            rows: [],
            rowCount: Number.isFinite(rowCount) ? rowCount : 0,
          };
        },
      };

      return handler(tx);
    });
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

type SqliteBindableValue = string | number | bigint | Buffer | null;

function normalizeSqliteParam(param: unknown, index: number): SqliteBindableValue {
  if (param === undefined || param === null) {
    return null;
  }

  if (typeof param === 'boolean') {
    return param ? 1 : 0;
  }

  if (param instanceof Date) {
    return param.toISOString();
  }

  if (typeof param === 'string' || typeof param === 'number' || typeof param === 'bigint') {
    return param;
  }

  if (Buffer.isBuffer(param)) {
    return param;
  }

  throw new TypeError(`Unsupported SQLite parameter at index ${index}.`);
}

class SqliteDatabase implements QueryExecutor {
  readonly dialect: DbDialect = 'sqlite';
  private readonly db: SqliteDatabaseDriver;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new SqliteDriver(filePath);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResultLike<T>> {
    const placeholderOrder = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
    const normalizedSql = normalizeSqliteQuery(sql);
    const statement = this.db.prepare(normalizedSql);
    const normalized = normalizedSql.trim().toLowerCase();
    const hasReturning = /\breturning\b/.test(normalized);
    const expectsRows = hasReturning || normalized.startsWith('select') || normalized.startsWith('with');
    const sourceParams =
      placeholderOrder.length > 0
        ? placeholderOrder.map((position) => params[position - 1])
        : params;
    const boundParams = sourceParams.map((param, index) => normalizeSqliteParam(param, index));

    if (expectsRows) {
      const rows = statement.all(...boundParams) as T[];
      return {
        rows: rows ?? [],
        rowCount: rows?.length ?? 0,
      };
    }

    const info = statement.run(...boundParams);
    return {
      rows: [],
      rowCount: Number.isFinite(info.changes) ? info.changes : 0,
    };
  }

  async execScript(sql: string): Promise<void> {
    const normalizedSql = normalizeSqliteQuery(sql);
    this.db.exec(normalizedSql);
  }

  async withTransaction<T>(handler: (tx: QueryExecutor) => Promise<T>): Promise<T> {
    await this.execScript('BEGIN');
    const tx: QueryExecutor = {
      query: async <R = Record<string, unknown>>(sql: string, params: unknown[] = []) => this.query<R>(sql, params),
    };

    try {
      const result = await handler(tx);
      await this.execScript('COMMIT');
      return result;
    } catch (error) {
      await this.execScript('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

type DatabaseBackend = PostgresDatabase | SqliteDatabase;

export class Database implements QueryExecutor {
  readonly dialect: DbDialect;
  private readonly backend: DatabaseBackend;

  private constructor(backend: DatabaseBackend) {
    this.backend = backend;
    this.dialect = backend.dialect;
  }

  static async create(): Promise<Database> {
    const provider = resolveDbProvider();

    if (provider === 'sqlite') {
      return new Database(new SqliteDatabase(resolveSqliteFilePath()));
    }

    return new Database(new PostgresDatabase(createPrismaClient()));
  }

  get remote(): boolean {
    return this.dialect === 'postgres';
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResultLike<T>> {
    return this.backend.query<T>(sql, params);
  }

  async execScript(sql: string): Promise<void> {
    await this.backend.execScript(sql);
  }

  async withTransaction<T>(handler: (tx: QueryExecutor) => Promise<T>): Promise<T> {
    return this.backend.withTransaction(handler);
  }

  async close(): Promise<void> {
    await this.backend.close();
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
