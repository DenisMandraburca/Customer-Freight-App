import type { LoadStatus, UserRole } from '@antigravity/shared';

export interface SessionUser {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
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
  special_notes: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
}
