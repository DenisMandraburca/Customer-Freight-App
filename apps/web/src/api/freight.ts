import type { LoadStatus } from '@antigravity/shared';

import type { ApiEnvelope, CustomerRecord, GreenbushRecord, LoadRecord, SessionUser, UserRecord } from '@/types/models';

import { unwrap, unwrapEnvelope } from './http';

export interface CreateLoadPayload {
  customerId: string;
  accountManagerId?: string | null;
  loadRefNumber?: string | null;
  mcleodOrderId?: string | null;
  puCity: string;
  puState: string;
  puZip?: string | null;
  puDate?: string | null;
  puAppt?: boolean;
  puApptTime?: string | null;
  delCity: string;
  delState: string;
  delZip?: string | null;
  delDate?: string | null;
  delAppt?: boolean;
  delApptTime?: string | null;
  rate: number;
  miles: number;
  notes?: string | null;
  assignedDispatcherId?: string | null;
  driverName?: string | null;
  truckNumber?: string | null;
  status?: LoadStatus;
}

export interface BookPayload {
  loadId: string;
  truckNumber: string;
  driverName: string;
}

export interface DecidePayload {
  loadId: string;
  decision: 'accept' | 'deny';
  denyReason?: string;
  notes?: string;
  requestedPickupDate?: string;
  newDeliveryDate?: string;
  loadRefNumber?: string;
  mcleodOrderId?: string;
}

export interface QuotePayload {
  loadId: string;
  pickupDate: string;
}

export interface GreenbushQuotePayload {
  greenbushId: string;
  pickupDate: string;
  truckNumber: string;
  driverName?: string;
}

export interface GreenbushMutationPayload {
  pickupLocation: string;
  destination: string;
  receivingHours?: string;
  price: number;
  tarp?: string;
  remainingCount: number;
  specialNotes?: string;
}

export interface UpdateLoadPayload {
  customerId?: string | null;
  accountManagerId?: string | null;
  loadRefNumber?: string;
  mcleodOrderId?: string | null;
  puCity?: string;
  puState?: string;
  puZip?: string | null;
  puDate?: string | null;
  puApptTime?: string | null;
  puAppt?: boolean;
  delCity?: string;
  delState?: string;
  delZip?: string | null;
  delDate?: string | null;
  delApptTime?: string | null;
  delAppt?: boolean;
  rate?: number;
  miles?: number;
  notes?: string | null;
  status?: LoadStatus;
  assignedDispatcherId?: string | null;
  driverName?: string | null;
  truckNumber?: string | null;
  equipment?: string | null;
  otherNotes?: string | null;
  delayReason?: string | null;
  cancelReason?: string | null;
  denyQuoteReason?: string | null;
  requestedPickupDate?: string | null;
}

export interface InitialDataPayload {
  currentUser: SessionUser;
  loads: LoadRecord[];
  customers: CustomerRecord[];
  users?: UserRecord[];
  greenbush: GreenbushRecord[];
}

export interface BulkImportError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: BulkImportError[];
}

export interface LoadFilters {
  status?: LoadStatus;
  customer?: string;
  dispatcher?: string;
  accountManager?: string;
  from?: string;
  to?: string;
  ref?: string;
}

function toQuery(filters?: LoadFilters): string {
  if (!filters) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getLoads(filters?: LoadFilters): Promise<LoadRecord[]> {
  return unwrap<LoadRecord[]>(`/api/customer-freight/loads${toQuery(filters)}`);
}

export async function createLoadEnvelope(payload: CreateLoadPayload): Promise<ApiEnvelope<LoadRecord>> {
  return unwrapEnvelope<LoadRecord>('/api/customer-freight/loads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createLoad(payload: CreateLoadPayload): Promise<LoadRecord> {
  const envelope = await createLoadEnvelope(payload);
  return envelope.data;
}

export async function bookLoad(payload: BookPayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/customer-freight/loads/${payload.loadId}/book`, {
    method: 'POST',
    body: JSON.stringify({
      truckNumber: payload.truckNumber,
      driverName: payload.driverName,
    }),
  });
}

export async function decideLoad(payload: DecidePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/customer-freight/loads/${payload.loadId}/decide`, {
    method: 'POST',
    body: JSON.stringify({
      decision: payload.decision,
      denyReason: payload.denyReason ?? payload.notes,
      requestedPickupDate: payload.requestedPickupDate,
      newDeliveryDate: payload.newDeliveryDate,
      loadRefNumber: payload.loadRefNumber,
      mcleodOrderId: payload.mcleodOrderId,
    }),
  });
}

export async function quoteLoad(payload: QuotePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/customer-freight/loads/${payload.loadId}/quote`, {
    method: 'POST',
    body: JSON.stringify({
      pickupDate: payload.pickupDate,
    }),
  });
}

export async function updateLoadStatus(loadId: string, status: LoadStatus, reason?: string): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/customer-freight/loads/${loadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function getGreenbush(): Promise<GreenbushRecord[]> {
  return unwrap<GreenbushRecord[]>('/api/customer-freight/greenbush');
}

export async function quoteGreenbush(payload: GreenbushQuotePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>('/api/customer-freight/greenbush/quote', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  return unwrap<CustomerRecord[]>('/api/customer-freight/admin/customers');
}

export async function getUsers(): Promise<UserRecord[]> {
  return unwrap<UserRecord[]>('/api/customer-freight/admin/users');
}

export async function updateLoad(loadId: string, payload: UpdateLoadPayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/customer-freight/loads/${loadId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLoad(loadId: string): Promise<void> {
  return unwrap<void>(`/api/customer-freight/loads/${loadId}`, {
    method: 'DELETE',
  });
}

export async function createCustomer(payload: {
  name: string;
  type: 'Direct Customer' | 'Broker';
  quoteAccept: boolean;
}): Promise<CustomerRecord> {
  return unwrap<CustomerRecord>('/api/customer-freight/admin/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  customerId: string,
  payload: {
    name: string;
    type: 'Direct Customer' | 'Broker';
    quoteAccept: boolean;
  },
): Promise<CustomerRecord> {
  return unwrap<CustomerRecord>(`/api/customer-freight/admin/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  return unwrap<void>(`/api/customer-freight/admin/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function createUser(payload: {
  email: string;
  name: string;
  role: UserRecord['role'];
  fullLoadAccess?: boolean;
}): Promise<UserRecord> {
  return unwrap<UserRecord>('/api/customer-freight/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  userId: string,
  payload: {
    email: string;
    name: string;
    role: UserRecord['role'];
    fullLoadAccess?: boolean;
  },
): Promise<UserRecord> {
  return unwrap<UserRecord>(`/api/customer-freight/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return unwrap<void>(`/api/customer-freight/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function banUser(userId: string): Promise<UserRecord> {
  return unwrap<UserRecord>(`/api/customer-freight/admin/users/${userId}/ban`, {
    method: 'POST',
  });
}

export async function createGreenbush(payload: GreenbushMutationPayload): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>('/api/customer-freight/greenbush', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGreenbush(greenbushId: string, payload: GreenbushMutationPayload): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>(`/api/customer-freight/greenbush/${greenbushId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGreenbush(greenbushId: string): Promise<void> {
  return unwrap<void>(`/api/customer-freight/greenbush/${greenbushId}`, {
    method: 'DELETE',
  });
}

export async function bulkReplaceGreenbush(rows: GreenbushMutationPayload[]): Promise<GreenbushRecord[]> {
  return unwrap<GreenbushRecord[]>('/api/customer-freight/greenbush/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export async function incrementGreenbush(greenbushId: string): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>(`/api/customer-freight/greenbush/${greenbushId}/increment`, {
    method: 'POST',
  });
}

export async function getInitialData(): Promise<InitialDataPayload> {
  return unwrap<InitialDataPayload>('/api/customer-freight/initial-data');
}

export async function bulkImportUsers(rows: Array<Record<string, string>>): Promise<BulkImportResult> {
  return unwrap<BulkImportResult>('/api/customer-freight/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export async function bulkImportLoads(rows: Array<Record<string, string>>): Promise<BulkImportResult> {
  return unwrap<BulkImportResult>('/api/customer-freight/loads/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export async function bulkImportCustomers(rows: Array<Record<string, string>>): Promise<BulkImportResult> {
  return unwrap<BulkImportResult>('/api/customer-freight/admin/customers/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}
