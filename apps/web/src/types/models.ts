import type { LoadStatus, UserRole } from '@antigravity/shared';

export interface SessionUser {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  full_load_access: boolean;
}

export interface LoadRecord {
  id: string;
  legacy_id: string | null;
  created_at: string;
  status: LoadStatus;
  account_manager_id: string | null;
  customer_id: string | null;
  load_ref_number: string;
  mcleod_order_id: string | null;
  requested_pickup_date: string | null;
  pu_city: string;
  pu_state: string;
  pu_zip: string | null;
  pu_date: string | null;
  pu_appt_time: string | null;
  pu_appt: boolean;
  del_city: string;
  del_state: string;
  del_zip: string | null;
  del_date: string | null;
  del_appt_time: string | null;
  del_appt: boolean;
  rate: string;
  miles: string;
  rpm: string;
  notes: string | null;
  equipment: string | null;
  assigned_dispatcher_id: string | null;
  driver_name: string | null;
  truck_number: string | null;
  reason_log: string | null;
  delay_reason: string | null;
  cancel_reason: string | null;
  deny_quote_reason: string | null;
  other_notes: string | null;
  greenbush_bank_id: string | null;
  customer_name: string | null;
  customer_quote_accept: boolean | null;
  account_manager_name: string | null;
  dispatcher_name: string | null;
}

export type ChatTargetScope = 'ORDER_PARTICIPANTS' | 'ACCOUNT_MANAGER' | 'DISPATCHER';

export interface LoadChatLoadSummaryRecord {
  id: string;
  created_at: string;
  status: LoadStatus;
  load_ref_number: string;
  mcleod_order_id: string | null;
  customer_name: string | null;
  pu_city: string;
  pu_state: string;
  del_city: string;
  del_state: string;
  account_manager_id: string | null;
  account_manager_name: string | null;
  assigned_dispatcher_id: string | null;
  dispatcher_name: string | null;
  driver_name: string | null;
  truck_number: string | null;
  order_key: string;
  order_label: string;
  unread_count: number;
  is_protected: boolean;
}

export interface LoadChatMessageRecord {
  id: string;
  load_id: string;
  sender_user_id: string | null;
  sender_name: string;
  message_text: string;
  message_type: 'MANUAL' | 'SYSTEM';
  target_scope: ChatTargetScope;
  target_user_id: string | null;
  target_user_name: string | null;
  system_event: string | null;
  created_at: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  type: 'Direct Customer' | 'Broker';
  quote_accept: boolean;
  total_delivered?: number;
  total_rate_delivered?: string;
  total_canceled?: number;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  full_load_access: boolean;
  default_flat_pay: string | null;
  exclude_from_payroll: boolean;
}

export interface GreenbushRecord {
  id: string;
  legacy_id: string | null;
  pickup_location: string;
  destination: string;
  receiving_hours: string | null;
  price: string;
  tarp: string | null;
  remaining_count: number;
  reserved_count: number;
  special_notes: string | null;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  warning?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: string;
  message: string;
}

export type SettlementCalculationMethod = 'PU' | 'DELIVERY';

export interface SettlementLoadEntry {
  id: string;
  settlementId: string;
  loadId: string | null;
  entryType: 'BROKER' | 'DIRECT_EXCEPTION' | 'DIRECT_STANDARD' | 'EXCLUDED_TONU' | 'CROSS_MONTH';
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

export interface SettlementRecord {
  id: string;
  summary: {
    userId: string;
    userName: string;
    month: number;
    year: number;
    calculationMethod: SettlementCalculationMethod;
    defaultFlatPay: number;
    brokerLoadCount: number;
    directExceptionLoadCount: number;
    directStandardLoadCount: number;
    tierApplied: number;
    tierRate: number;
    totalLoadCompensation: number;
    totalSettlementAmount: number;
    generatedByUserId: string;
    generatedByName: string;
    tierVersion: number;
    createdAt: string;
    status: 'ACTIVE' | 'OVERRIDDEN';
  };
}

export interface SettlementDetail extends SettlementRecord {
  brokerLoads: SettlementLoadEntry[];
  directExceptionLoads: SettlementLoadEntry[];
  directStandardLoads: SettlementLoadEntry[];
  excludedTonuLoads: SettlementLoadEntry[];
  crossMonthLoads: SettlementLoadEntry[];
}

export interface SettlementTierConfig {
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

export interface SettlementConfig {
  tierConfig: SettlementTierConfig;
  directExceptionCustomerIds: string[];
}
