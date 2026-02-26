import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DbDialect = 'postgres' | 'sqlite';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(srcDir, '..');
const defaultSqlitePath = path.join(packageRoot, 'data', 'dev.db');
const defaultSqliteUrl = 'file:./data/dev.db';

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveDbProvider(): DbDialect {
  const raw = trimToNull(process.env.DB_PROVIDER)?.toLowerCase();

  if (raw === 'postgres' || raw === 'postgresql') {
    return 'postgres';
  }

  if (raw === 'sqlite') {
    return 'sqlite';
  }

  return process.env.NODE_ENV === 'production' ? 'postgres' : 'sqlite';
}

export function resolveSqliteUrl(): string {
  const envValue = trimToNull(process.env.SQLITE_URL);
  if (envValue) {
    return envValue;
  }

  return defaultSqliteUrl;
}

export function resolveSqliteFilePath(): string {
  const url = resolveSqliteUrl();

  if (url.startsWith('file:')) {
    const withoutScheme = url.slice('file:'.length);

    if (withoutScheme.startsWith('//')) {
      return fileURLToPath(url);
    }

    const maybePath = withoutScheme.startsWith('/') ? withoutScheme : path.resolve(packageRoot, withoutScheme);
    return path.normalize(maybePath);
  }

  if (url.startsWith('sqlite:')) {
    const withoutScheme = url.slice('sqlite:'.length);
    const normalized = withoutScheme.startsWith('file:') ? withoutScheme : `file:${withoutScheme}`;
    return resolveSqliteFilePathFromFileUrl(normalized);
  }

  return path.isAbsolute(url) ? url : path.resolve(packageRoot, url);
}

function resolveSqliteFilePathFromFileUrl(fileUrl: string): string {
  if (!fileUrl.startsWith('file:')) {
    return resolveSqliteFilePath();
  }

  const withoutScheme = fileUrl.slice('file:'.length);
  if (withoutScheme.startsWith('//')) {
    return fileURLToPath(fileUrl);
  }

  const maybePath = withoutScheme.startsWith('/') ? withoutScheme : path.resolve(packageRoot, withoutScheme);
  return path.normalize(maybePath);
}
