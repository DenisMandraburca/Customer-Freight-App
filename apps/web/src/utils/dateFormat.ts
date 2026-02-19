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
