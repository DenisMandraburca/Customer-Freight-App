import type { ReportTableColumn, ReportTableRow } from './reportHelpers';

function timestampSuffix(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
}

function sanitizeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function triggerDownload(href: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function downloadCsv(reportId: string, columns: ReportTableColumn[], rows: ReportTableRow[]): void {
  const header = columns.map((column) => sanitizeCsvCell(column.label)).join(',');
  const dataRows = rows.map((row) => columns.map((column) => sanitizeCsvCell(row[column.key])).join(','));
  const csvContent = [header, ...dataRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const href = URL.createObjectURL(blob);
  triggerDownload(href, `report-${reportId}-${timestampSuffix()}.csv`);
  URL.revokeObjectURL(href);
}
