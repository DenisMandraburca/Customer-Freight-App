import type { LoadRecord, SettlementLoadPaidHistoryRecord } from '@antigravity/db';

export interface CrossMonthLoadRecord {
  load: LoadRecord;
  previousSettlementId: string;
  previousSettlementMonth: number;
  previousSettlementYear: number;
}

export interface CrossMonthAdjustmentResult {
  payableLoads: LoadRecord[];
  crossMonthLoads: CrossMonthLoadRecord[];
}

export class CrossMonthAdjustmentService {
  adjust(loads: LoadRecord[], paidHistory: SettlementLoadPaidHistoryRecord[]): CrossMonthAdjustmentResult {
    const historyByLoadId = new Map<string, SettlementLoadPaidHistoryRecord>();
    for (const row of paidHistory) {
      if (!historyByLoadId.has(row.load_id)) {
        historyByLoadId.set(row.load_id, row);
      }
    }

    const payableLoads: LoadRecord[] = [];
    const crossMonthLoads: CrossMonthLoadRecord[] = [];

    for (const load of loads) {
      const history = historyByLoadId.get(load.id);
      if (!history) {
        payableLoads.push(load);
        continue;
      }

      crossMonthLoads.push({
        load,
        previousSettlementId: history.settlement_id,
        previousSettlementMonth: history.month,
        previousSettlementYear: history.year,
      });
    }

    return {
      payableLoads,
      crossMonthLoads,
    };
  }
}
