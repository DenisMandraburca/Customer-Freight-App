export function formatDateDisplay(date: string | null | undefined): string {
  if (!date) {
    return '';
  }

  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (direct) {
    return `${direct[2]}/${direct[3]}/${direct[1]}`;
  }

  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})T/.exec(date);
  if (isoPrefix) {
    return `${isoPrefix[2]}/${isoPrefix[3]}/${isoPrefix[1]}`;
  }

  return date;
}

function parseTimestampWithUtcFallback(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasZone = /(Z|[+-]\d{2}(?::?\d{2})?)$/i.test(trimmed);
  const sqlDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(trimmed);
  const isoDateTimeNoZone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(trimmed) && !hasZone;

  if (sqlDateTime) {
    const parsedSql = new Date(`${trimmed.replace(' ', 'T')}Z`);
    return Number.isNaN(parsedSql.getTime()) ? null : parsedSql;
  }

  if (isoDateTimeNoZone) {
    const parsedIso = new Date(`${trimmed}Z`);
    return Number.isNaN(parsedIso.getTime()) ? null : parsedIso;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTimeDisplayLocal(date: string | null | undefined): string {
  if (!date) {
    return '';
  }

  const parsed = parseTimestampWithUtcFallback(date);
  if (!parsed) {
    return date;
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
