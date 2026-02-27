import type { LoadStatus, UserRole } from '@antigravity/shared';

import type { SettlementCalculationMethod, SettlementLoadEntryType } from '@antigravity/db';

export interface SettlementLoadEntryDto {
  id: string;
  settlementId: string;
  loadId: string | null;
  entryType: SettlementLoadEntryType;
  compensationAmount: number;
  customerType: string | null;
  status: LoadStatus | null;
  revenue: number;
  puDate: string | null;
  delDate: string | null;
  loadRefNumber: string | null;
  mcleodOrderId: string | null;
  customerName: string | null;
  previousSettlementId: string | null;
  previousSettlementMonth: number | null;
  previousSettlementYear: number | null;
}

export interface SettlementTierConfigDto {
  id: string;
  version: number;
  brokerLoadPay: number;
  tier1MaxLoad: number;
  tier1Rate: number;
  tier2MaxLoad: number;
  tier2Rate: number;
  tier3Rate: number;
  createdByUserId: string | null;
  createdAt: string;
}

export interface SettlementSummaryDto {
  userId: string;
  userName: string;
  month: number;
  year: number;
  calculationMethod: SettlementCalculationMethod;
  defaultFlatPay: number;
  brokerLoadCount: number;
  directExceptionLoadCount: number;
  directStandardLoadCount: number;
  tierBasisLoadCount: number | null;
  tierApplied: number;
  tierRate: number;
  totalLoadCompensation: number;
  totalSettlementAmount: number;
  generatedByUserId: string;
  generatedByName: string;
  tierVersion: number;
  createdAt: string;
  status: 'ACTIVE' | 'OVERRIDDEN';
}

export interface SettlementDetailDto {
  id: string;
  summary: SettlementSummaryDto;
  brokerLoads: SettlementLoadEntryDto[];
  directExceptionLoads: SettlementLoadEntryDto[];
  directStandardLoads: SettlementLoadEntryDto[];
  excludedTonuLoads: SettlementLoadEntryDto[];
  crossMonthLoads: SettlementLoadEntryDto[];
}

export interface SettlementRecordDto {
  id: string;
  summary: SettlementSummaryDto;
}

export interface SettlementConfigDto {
  tierConfig: SettlementTierConfigDto;
  directExceptionCustomerIds: string[];
}

export interface GenerateSettlementInput {
  userId: string;
  month: number;
  year: number;
  calculationMethod: SettlementCalculationMethod;
  override: boolean;
  generatedByUserId: string;
  generatedByName: string;
}

export interface EligibleSettlementUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  defaultFlatPay: number | null;
}
