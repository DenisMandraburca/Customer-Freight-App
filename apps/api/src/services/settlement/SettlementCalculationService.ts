import {
  HttpError,
  type CustomerRecord,
  type FreightRepository,
  type LoadRecord,
  type SettlementCalculationMethod,
  type SettlementDetailRecord,
  type SettlementLoadEntryRecord,
  type SettlementLoadEntryType,
  type SettlementSummaryRecord,
  type SettlementTierConfigRecord,
} from '@antigravity/db';

import { CrossMonthAdjustmentService } from './CrossMonthAdjustmentService.js';
import { TierEngine } from './TierEngine.js';
import type {
  GenerateSettlementInput,
  SettlementConfigDto,
  SettlementRecordDto,
  SettlementDetailDto,
  SettlementLoadEntryDto,
  SettlementTierConfigDto,
} from './types.js';

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel(month: number): string {
  return `${month}`.padStart(2, '0');
}

function isSettlementEligibleRole(role: string): boolean {
  return role === 'ACCOUNT_MANAGER' || role === 'ADMIN' || role === 'MANAGER';
}

function toTierConfigDto(config: SettlementTierConfigRecord): SettlementTierConfigDto {
  return {
    id: config.id,
    version: config.version,
    brokerLoadPay: toNumber(config.broker_load_pay),
    tier1MaxLoad: config.tier1_max_load,
    tier1Rate: toNumber(config.tier1_rate),
    tier2MaxLoad: config.tier2_max_load,
    tier2Rate: toNumber(config.tier2_rate),
    tier3Rate: toNumber(config.tier3_rate),
    createdByUserId: config.created_by_user_id,
    createdAt: config.created_at,
  };
}

function mapEntry(entry: SettlementLoadEntryRecord): SettlementLoadEntryDto {
  return {
    id: entry.id,
    settlementId: entry.settlement_id,
    loadId: entry.load_id,
    entryType: entry.entry_type,
    compensationAmount: toNumber(entry.compensation_amount),
    customerType: entry.customer_type_snapshot,
    status: entry.status_snapshot,
    revenue: toNumber(entry.revenue_snapshot),
    puDate: entry.pu_date_snapshot,
    delDate: entry.del_date_snapshot,
    loadRefNumber: entry.load_ref_number_snapshot,
    mcleodOrderId: entry.mcleod_order_id_snapshot,
    customerName: entry.customer_name_snapshot,
    previousSettlementId: entry.previous_settlement_id,
    previousSettlementMonth: entry.previous_settlement_month,
    previousSettlementYear: entry.previous_settlement_year,
  };
}

function toSettlementSummaryDto(record: SettlementDetailRecord | SettlementSummaryRecord) {
  return {
    userId: record.user_id,
    userName: record.user_name ?? 'Unknown User',
    month: record.month,
    year: record.year,
    calculationMethod: record.calculation_method,
    defaultFlatPay: toNumber(record.default_flat_pay),
    brokerLoadCount: record.broker_load_count,
    directExceptionLoadCount: record.direct_exception_load_count,
    directStandardLoadCount: record.direct_standard_load_count,
    tierBasisLoadCount: record.tier_basis_load_count === null ? null : Number(record.tier_basis_load_count),
    tierApplied: record.tier_applied,
    tierRate: toNumber(record.tier_rate),
    totalLoadCompensation: toNumber(record.total_load_compensation),
    totalSettlementAmount: toNumber(record.total_settlement_amount),
    generatedByUserId: record.generated_by_user_id,
    generatedByName: record.generated_by_name ?? 'Unknown User',
    tierVersion: record.tier_version,
    createdAt: record.created_at,
    status: record.status,
  };
}

function toSettlementDetailDto(record: SettlementDetailRecord): SettlementDetailDto {
  const mappedEntries = record.entries.map(mapEntry);
  const byType = (entryType: SettlementLoadEntryType): SettlementLoadEntryDto[] =>
    mappedEntries.filter((entry) => entry.entryType === entryType);

  return {
    id: record.id,
    summary: toSettlementSummaryDto(record),
    brokerLoads: byType('BROKER'),
    directExceptionLoads: byType('DIRECT_EXCEPTION'),
    directStandardLoads: byType('DIRECT_STANDARD'),
    excludedTonuLoads: byType('EXCLUDED_TONU'),
    crossMonthLoads: byType('CROSS_MONTH'),
  };
}

export class SettlementCalculationService {
  constructor(
    private readonly repository: FreightRepository,
    private readonly tierEngine = new TierEngine(),
    private readonly crossMonthAdjustmentService = new CrossMonthAdjustmentService(),
  ) {}

  async getConfig(): Promise<SettlementConfigDto> {
    let activeTier = await this.repository.getActiveSettlementTierConfig();
    if (!activeTier) {
      await this.repository.ensureDefaultSettlementTierConfig();
      activeTier = await this.repository.getActiveSettlementTierConfig();
    }

    if (!activeTier) {
      throw new HttpError('No active settlement tier configuration found.', 500, 'INTERNAL_ERROR');
    }

    const directExceptions = await this.repository.listSettlementDirectCustomerExceptions();

    return {
      tierConfig: toTierConfigDto(activeTier),
      directExceptionCustomerIds: directExceptions.map((row) => row.customer_id),
    };
  }

  async updateTierConfig(input: {
    brokerLoadPay: number;
    tier1MaxLoad: number;
    tier1Rate: number;
    tier2MaxLoad: number;
    tier2Rate: number;
    tier3Rate: number;
    createdByUserId: string;
  }): Promise<SettlementTierConfigDto> {
    const created = await this.repository.createSettlementTierConfig({
      brokerLoadPay: input.brokerLoadPay,
      tier1MaxLoad: input.tier1MaxLoad,
      tier1Rate: input.tier1Rate,
      tier2MaxLoad: input.tier2MaxLoad,
      tier2Rate: input.tier2Rate,
      tier3Rate: input.tier3Rate,
      createdByUserId: input.createdByUserId,
    });

    return toTierConfigDto(created);
  }

  async replaceDirectCustomerExceptions(customerIds: string[], createdByUserId: string): Promise<string[]> {
    const customers = await this.repository.listCustomers();
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));

    for (const customerId of customerIds) {
      const customer = customerById.get(customerId);
      if (!customer) {
        throw new HttpError(`Customer not found: ${customerId}`, 404, 'NOT_FOUND');
      }

      if (customer.type !== 'Direct Customer') {
        throw new HttpError(`Customer ${customer.name} is not a Direct Customer.`, 400, 'VALIDATION_ERROR');
      }
    }

    const rows = await this.repository.replaceSettlementDirectCustomerExceptions(customerIds, createdByUserId);
    return rows.map((row) => row.customer_id);
  }

  async updateUserDefaultFlatPay(
    userId: string,
    defaultFlatPay: number | null,
    excludeFromPayroll?: boolean,
  ): Promise<{ defaultFlatPay: number | null; excludeFromPayroll: boolean }> {
    const user = await this.repository.updateUserDefaultFlatPay(userId, defaultFlatPay, excludeFromPayroll);
    return {
      defaultFlatPay: user.default_flat_pay === null ? null : toNumber(user.default_flat_pay),
      excludeFromPayroll: Boolean(user.exclude_from_payroll),
    };
  }

  async getSettlementDetail(settlementId: string): Promise<SettlementDetailDto> {
    const detail = await this.repository.getSettlementDetailById(settlementId);
    if (!detail) {
      throw new HttpError('Settlement not found.', 404, 'NOT_FOUND');
    }

    return toSettlementDetailDto(detail);
  }

  async listSettlementHistory(limit = 100): Promise<SettlementRecordDto[]> {
    const rows = await this.repository.listSettlementSummaries(limit);
    return rows.map((row) => ({
      id: row.id,
      summary: toSettlementSummaryDto(row),
    }));
  }

  async deleteSettlement(settlementId: string): Promise<void> {
    await this.repository.deleteSettlement(settlementId);
  }

  async generateSettlement(input: GenerateSettlementInput): Promise<SettlementDetailDto> {
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new HttpError('month must be between 1 and 12.', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isInteger(input.year) || input.year < 2000) {
      throw new HttpError('year must be >= 2000.', 400, 'VALIDATION_ERROR');
    }

    const targetUser = await this.repository.getUserById(input.userId);
    if (!targetUser) {
      throw new HttpError('Target user not found.', 404, 'NOT_FOUND');
    }

    if (!isSettlementEligibleRole(targetUser.role)) {
      throw new HttpError('Target user role is not eligible for settlements.', 400, 'VALIDATION_ERROR');
    }
    if (targetUser.exclude_from_payroll) {
      throw new HttpError('Target user is excluded from payroll.', 400, 'VALIDATION_ERROR');
    }

    if (targetUser.default_flat_pay === null) {
      throw new HttpError('Target user must have a default flat pay configured.', 400, 'VALIDATION_ERROR');
    }

    const existing = await this.repository.findActiveSettlementByKey(
      input.userId,
      input.month,
      input.year,
      input.calculationMethod,
    );

    if (existing && !input.override) {
      throw new HttpError('Settlement already exists for this month/year/method.', 409, 'SETTLEMENT_EXISTS');
    }

    const loads = await this.repository.listLoadsForSettlementWindow(
      input.userId,
      input.month,
      input.year,
      input.calculationMethod,
    );

    if (loads.length === 0) {
      throw new HttpError(
        `No loads assigned to user for ${input.year}-${monthLabel(input.month)} (${input.calculationMethod}).`,
        400,
        'VALIDATION_ERROR',
      );
    }

    const activeTier = await this.repository.getActiveSettlementTierConfig();
    if (!activeTier) {
      throw new HttpError('No active tier configuration is available.', 500, 'INTERNAL_ERROR');
    }

    const customers = await this.repository.listCustomers();
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));

    const directExceptionRows = await this.repository.listSettlementDirectCustomerExceptions();
    const directExceptionCustomerIds = new Set(directExceptionRows.map((row) => row.customer_id));

    const excludedTonuLoads = loads.filter((load) => load.status === 'TONU' && toNumber(load.rate) < 200);
    const eligibleLoads = loads.filter((load) => {
      if (load.status === 'CANCELED') {
        return false;
      }
      if (load.status === 'TONU' && toNumber(load.rate) < 200) {
        return false;
      }
      return true;
    });

    const paidHistory = await this.repository.listActivePaidSettlementLoadHistory(input.userId, {
      excludeSettlementId: existing?.id,
    });

    const crossMonthAdjustment = this.crossMonthAdjustmentService.adjust(eligibleLoads, paidHistory);

    const brokerLoads: Array<{ load: LoadRecord; customer: CustomerRecord | null }> = [];
    const directExceptionLoads: Array<{ load: LoadRecord; customer: CustomerRecord | null }> = [];
    const directStandardLoads: Array<{ load: LoadRecord; customer: CustomerRecord | null }> = [];

    for (const load of crossMonthAdjustment.payableLoads) {
      const customer = load.customer_id ? customerById.get(load.customer_id) ?? null : null;

      if (customer?.type === 'Direct Customer') {
        if (load.customer_id && directExceptionCustomerIds.has(load.customer_id)) {
          directExceptionLoads.push({ load, customer });
        } else {
          directStandardLoads.push({ load, customer });
        }
      } else {
        brokerLoads.push({ load, customer });
      }
    }

    const tierBasisLoadCount = crossMonthAdjustment.payableLoads.length;
    const tier = this.tierEngine.resolveTier(activeTier, tierBasisLoadCount);
    const brokerRate = toNumber(activeTier.broker_load_pay);

    const defaultFlatPay = toNumber(targetUser.default_flat_pay);
    const brokerComp = brokerLoads.length * brokerRate;
    const directExceptionComp = directExceptionLoads.length * brokerRate;
    const directStandardComp = directStandardLoads.length * tier.tierRate;
    const totalLoadComp = brokerComp + directExceptionComp + directStandardComp;
    const totalSettlement = defaultFlatPay + totalLoadComp;

    const excludedJson = excludedTonuLoads.map((load) => ({
      loadId: load.id,
      loadRefNumber: load.load_ref_number,
      mcleodOrderId: load.mcleod_order_id,
      status: load.status,
      revenue: toNumber(load.rate),
      note: 'Excluded - Revenue below $200',
    }));

    const crossMonthJson = crossMonthAdjustment.crossMonthLoads.map((row) => ({
      loadId: row.load.id,
      loadRefNumber: row.load.load_ref_number,
      mcleodOrderId: row.load.mcleod_order_id,
      puDate: row.load.pu_date,
      delDate: row.load.del_date,
      previousSettlementId: row.previousSettlementId,
      previousSettlementMonth: row.previousSettlementMonth,
      previousSettlementYear: row.previousSettlementYear,
    }));

    const makeEntry = (
      load: LoadRecord,
      customerType: string | null,
      entryType: SettlementLoadEntryType,
      compensationAmount: number,
      previous?: { id: string; month: number; year: number },
    ) => ({
      loadId: load.id,
      entryType,
      compensationAmount,
      customerTypeSnapshot: customerType,
      statusSnapshot: load.status,
      revenueSnapshot: toNumber(load.rate),
      puDateSnapshot: load.pu_date,
      delDateSnapshot: load.del_date,
      loadRefNumberSnapshot: load.load_ref_number,
      mcleodOrderIdSnapshot: load.mcleod_order_id,
      customerNameSnapshot: load.customer_name,
      previousSettlementId: previous?.id ?? null,
      previousSettlementMonth: previous?.month ?? null,
      previousSettlementYear: previous?.year ?? null,
    });

    const entries = [
      ...brokerLoads.map(({ load, customer }) => makeEntry(load, customer?.type ?? null, 'BROKER', brokerRate)),
      ...directExceptionLoads.map(({ load, customer }) =>
        makeEntry(load, customer?.type ?? null, 'DIRECT_EXCEPTION', brokerRate),
      ),
      ...directStandardLoads.map(({ load, customer }) =>
        makeEntry(load, customer?.type ?? null, 'DIRECT_STANDARD', tier.tierRate),
      ),
      ...excludedTonuLoads.map((load) => makeEntry(load, 'Direct Customer', 'EXCLUDED_TONU', 0)),
      ...crossMonthAdjustment.crossMonthLoads.map((row) =>
        makeEntry(row.load, row.load.customer_id ? customerById.get(row.load.customer_id)?.type ?? null : null, 'CROSS_MONTH', 0, {
          id: row.previousSettlementId,
          month: row.previousSettlementMonth,
          year: row.previousSettlementYear,
        }),
      ),
    ];

    const saved = await this.repository.createSettlementWithEntries({
      userId: input.userId,
      month: input.month,
      year: input.year,
      calculationMethod: input.calculationMethod,
      defaultFlatPay,
      brokerLoadCount: brokerLoads.length,
      directExceptionLoadCount: directExceptionLoads.length,
      directStandardLoadCount: directStandardLoads.length,
      tierBasisLoadCount,
      tierApplied: tier.tierApplied,
      tierRate: tier.tierRate,
      totalLoadCompensation: totalLoadComp,
      totalSettlementAmount: totalSettlement,
      excludedLoadsJson: excludedJson,
      crossMonthLoadsJson: crossMonthJson,
      generatedByUserId: input.generatedByUserId,
      tierVersion: activeTier.version,
      overrideSettlementId: existing?.id,
      entries,
    });

    return toSettlementDetailDto(saved);
  }
}
