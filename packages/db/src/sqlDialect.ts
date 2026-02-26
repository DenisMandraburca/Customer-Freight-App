import type { DbDialect } from './dbConfig.js';

export function sqlByDialect<T>(dialect: DbDialect, options: { postgres: T; sqlite: T }): T {
  return dialect === 'sqlite' ? options.sqlite : options.postgres;
}

export function ciLike(dialect: DbDialect, column: string, paramIndex: number): string {
  if (dialect === 'sqlite') {
    return `lower(${column}) like lower($${paramIndex})`;
  }
  return `${column} ilike $${paramIndex}`;
}

export function idEquals(dialect: DbDialect, column: string, paramIndex: number): string {
  if (dialect === 'sqlite') {
    return `${column} = $${paramIndex}`;
  }
  return `${column}::text = $${paramIndex}`;
}

export function dateAsText(dialect: DbDialect, column: string, alias: string): string {
  if (dialect === 'sqlite') {
    return `${column} as ${alias}`;
  }
  return `${column}::text as ${alias}`;
}

export function greatest(dialect: DbDialect, left: string, right: string): string {
  if (dialect === 'sqlite') {
    return `max(${left}, ${right})`;
  }
  return `greatest(${left}, ${right})`;
}

export function normalizeSqliteQuery(sql: string): string {
  return sql
    .replace(/\$(\d+)/g, '?')
    .replace(/\bilike\b/gi, 'like')
    .replace(/::[a-zA-Z_][a-zA-Z0-9_]*(\([^)]*\))?/g, '');
}
