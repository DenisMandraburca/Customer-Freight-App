import PDFDocument from 'pdfkit';

import type { SettlementDetailDto, SettlementLoadEntryDto } from './types.js';

export type SettlementPdfMode = 'summary' | 'detailed';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (direct) {
    return `${direct[2]}/${direct[3]}/${direct[1]}`;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value.trim());
  if (iso) {
    return `${iso[2]}/${iso[3]}/${iso[1]}`;
  }

  return value;
}

function parseGeneratedTimestamp(value: string): Date | null {
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

function formatGeneratedDate(value: string): string {
  const parsed = parseGeneratedTimestamp(value);
  if (!parsed) {
    return value;
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

function formatMonthYearLong(month: number, year: number): string {
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  return `${monthLabel}, ${year}`;
}

function sumEntryAmounts(rows: SettlementLoadEntryDto[]): number {
  return rows.reduce((sum, row) => sum + row.compensationAmount, 0);
}

function resolveBrokerLoadPay(detail: SettlementDetailDto): number {
  const brokerCount = detail.brokerLoads.length;
  if (brokerCount > 0) {
    return sumEntryAmounts(detail.brokerLoads) / brokerCount;
  }

  const directExceptionCount = detail.directExceptionLoads.length;
  if (directExceptionCount > 0) {
    return sumEntryAmounts(detail.directExceptionLoads) / directExceptionCount;
  }

  return 5;
}

interface CursorState {
  y: number;
}

export class PDFGeneratorService {
  async generateSettlementPdf(detail: SettlementDetailDto, mode: SettlementPdfMode = 'summary'): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const state: CursorState = { y: 40 };

      doc.font('Helvetica-Bold').fontSize(16).text('AFC Transport - Settlement Report', 40, state.y);
      state.y += 24;

      doc.font('Helvetica').fontSize(10);
      this.writeLine(doc, state, `Employee: ${detail.summary.userName}`);
      this.writeLine(doc, state, `Settlement Month: ${formatMonthYearLong(detail.summary.month, detail.summary.year)}`);
      this.writeLine(doc, state, `Calculation Method: ${detail.summary.calculationMethod}`);
      this.writeLine(doc, state, `Date Generated: ${formatGeneratedDate(detail.summary.createdAt)}`);
      this.writeLine(doc, state, `Report Type: ${mode === 'detailed' ? 'Detailed Settlement' : 'Summary Settlement'}`);

      state.y += 8;
      this.writeSummary(doc, state, detail);

      if (mode === 'detailed') {
        state.y += 10;
        this.writeSection(doc, state, 'Broker Loads', detail.brokerLoads);
        this.writeSection(doc, state, 'Direct Exception Loads', detail.directExceptionLoads);
        this.writeSection(doc, state, 'Standard Direct Tier Loads', detail.directStandardLoads);
        this.writeSection(doc, state, 'Excluded TONU Loads (< $200)', detail.excludedTonuLoads);
        this.writeSection(doc, state, 'Delivered This Month - Paid Previously', detail.crossMonthLoads);
      }

      doc.end();
    });
  }

  private ensureSpace(doc: PDFKit.PDFDocument, state: CursorState, minHeight: number): void {
    if (state.y + minHeight <= doc.page.height - 40) {
      return;
    }

    doc.addPage();
    state.y = 40;
  }

  private writeLine(doc: PDFKit.PDFDocument, state: CursorState, line: string): void {
    this.ensureSpace(doc, state, 14);
    doc.text(line, 40, state.y);
    state.y += 14;
  }

  private writeSummary(doc: PDFKit.PDFDocument, state: CursorState, detail: SettlementDetailDto): void {
    const x1 = 40;
    const x2 = 280;
    const x3 = 390;
    const x4 = 500;
    const rowHeight = 14;

    const brokerPay = resolveBrokerLoadPay(detail);
    const brokerTotal = sumEntryAmounts(detail.brokerLoads);
    const directExceptionTotal = sumEntryAmounts(detail.directExceptionLoads);
    const standardTotal = sumEntryAmounts(detail.directStandardLoads);
    const tierBasisLabel =
      detail.summary.tierBasisLoadCount === null ? 'Legacy' : `${detail.summary.tierBasisLoadCount}`;

    const directExceptionByCustomer = new Map<string, { count: number; amount: number }>();
    for (const row of detail.directExceptionLoads) {
      const customerName = row.customerName?.trim() || 'Unknown Customer';
      const existing = directExceptionByCustomer.get(customerName);
      if (existing) {
        existing.count += 1;
        existing.amount += row.compensationAmount;
        continue;
      }
      directExceptionByCustomer.set(customerName, { count: 1, amount: row.compensationAmount });
    }

    this.ensureSpace(doc, state, 22);
    doc.font('Helvetica-Bold').fontSize(12).text('Summary', 40, state.y);
    state.y += 16;

    this.ensureSpace(doc, state, 16);
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Category', x1, state.y);
    doc.text('Volume', x2, state.y, { width: 100, align: 'right' });
    doc.text('Rate / Tier', x3, state.y, { width: 90, align: 'right' });
    doc.text('Amount', x4, state.y, { width: 70, align: 'right' });
    state.y += rowHeight;

    const row = (
      category: string,
      basis: string,
      rate: string,
      amount: string,
      options?: { indent?: number; muted?: boolean; bold?: boolean; categorySpan?: boolean },
    ) => {
      const indent = options?.indent ?? 0;
      const muted = options?.muted ?? false;
      const bold = options?.bold ?? false;
      const categorySpan = options?.categorySpan ?? false;

      this.ensureSpace(doc, state, 16);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      const color = muted ? '#666666' : '#111111';
      doc.fillColor(color);
      if (categorySpan) {
        doc.text(category, x1 + indent, state.y, { width: x3 - x1 - 8 });
      } else {
        doc.text(category, x1 + indent, state.y);
        doc.text(basis, x2, state.y, { width: 100, align: 'right' });
        doc.text(rate, x3, state.y, { width: 90, align: 'right' });
      }
      doc.text(amount, x4, state.y, { width: 70, align: 'right' });
      doc.fillColor('#111111');
      state.y += rowHeight;
    };

    row('Default Flat Pay', '-', '-', formatCurrency(detail.summary.defaultFlatPay), { bold: true });
    row(
      'Broker Loads',
      `${detail.summary.brokerLoadCount}`,
      `${formatCurrency(brokerPay)}`,
      formatCurrency(brokerTotal),
      { indent: 16, bold: true },
    );
    row('Direct Exception Loads', '', '', formatCurrency(directExceptionTotal), {
      indent: 16,
      bold: true,
      categorySpan: true,
    });

    for (const [customerName, data] of [...directExceptionByCustomer.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )) {
      row(`${customerName}`, `${data.count}`, `${formatCurrency(brokerPay)}`, formatCurrency(data.amount), {
        indent: 32,
        muted: true,
      });
    }

    row(
      'Standard Direct Loads',
      `${detail.summary.directStandardLoadCount}`,
      `Tier ${detail.summary.tierApplied} • ${formatCurrency(detail.summary.tierRate)}`,
      formatCurrency(standardTotal),
      { indent: 16, bold: true },
    );
    row(`Basis (All Payable Loads): ${tierBasisLabel}`, '', '', '', {
      indent: 32,
      muted: true,
      categorySpan: true,
    });

    if (detail.excludedTonuLoads.length > 0) {
      row('Excluded TONU (< $200)', `${detail.excludedTonuLoads.length}`, 'Not Paid', formatCurrency(0), {
        indent: 16,
        bold: true,
      });
      for (const load of detail.excludedTonuLoads) {
        row(
          `McLeod Order #${load.mcleodOrderId || 'N/A'} | Revenue ${formatCurrency(load.revenue)}`,
          '',
          '',
          '',
          {
            indent: 32,
            muted: true,
            categorySpan: true,
          },
        );
      }
    }

    if (detail.crossMonthLoads.length > 0) {
      row('Cross-Month (Already Paid)', `${detail.crossMonthLoads.length}`, 'Already Paid', formatCurrency(0), {
        indent: 16,
        bold: true,
      });
      for (const load of detail.crossMonthLoads) {
        row(
          `McLeod Order #${load.mcleodOrderId || 'N/A'} | Revenue ${formatCurrency(load.revenue)}`,
          '',
          '',
          '',
          {
            indent: 32,
            muted: true,
            categorySpan: true,
          },
        );
      }
    }

    row('Total Load Compensation', '', '', formatCurrency(detail.summary.totalLoadCompensation), {
      bold: true,
      categorySpan: true,
    });
    row('Total Settlement', '', '', formatCurrency(detail.summary.totalSettlementAmount), {
      bold: true,
      categorySpan: true,
    });
  }

  private writeSection(
    doc: PDFKit.PDFDocument,
    state: CursorState,
    title: string,
    entries: SettlementLoadEntryDto[],
  ): void {
    this.ensureSpace(doc, state, 22);
    doc.font('Helvetica-Bold').fontSize(11).text(title, 40, state.y);
    state.y += 16;

    doc.font('Helvetica').fontSize(9);
    if (entries.length === 0) {
      this.writeLine(doc, state, 'None');
      state.y += 4;
      return;
    }

    for (const entry of entries) {
      this.ensureSpace(doc, state, 40);
      const label = entry.mcleodOrderId
        ? `${entry.loadRefNumber || '-'} / McLeod ${entry.mcleodOrderId}`
        : (entry.loadRefNumber || '-');
      this.writeLine(doc, state, `Load: ${label}`);
      this.writeLine(
        doc,
        state,
        `Status: ${entry.status || '-'} | Revenue: ${formatCurrency(entry.revenue)} | Compensation: ${formatCurrency(entry.compensationAmount)}`,
      );
      this.writeLine(
        doc,
        state,
        `PU: ${formatDate(entry.puDate)} | DEL: ${formatDate(entry.delDate)}${
          entry.previousSettlementMonth && entry.previousSettlementYear
            ? ` | Prev Settlement: ${String(entry.previousSettlementMonth).padStart(2, '0')}/${entry.previousSettlementYear}`
            : ''
        }`,
      );
      state.y += 4;
    }
  }
}
