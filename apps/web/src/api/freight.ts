import type { CustomerRecord, GreenbushRecord, LoadRecord, SessionUser, UserRecord } from '@/types/models';
import type { LoadStatus } from '@antigravity/shared';

import { unwrap } from './http';

export interface CreateLoadPayload {
  customerId: string;
  loadRefNumber: string;
  mcleodOrderId?: string;
  puCity: string;
  puState: string;
  puDate?: string;
  delCity: string;
  delState: string;
  delDate?: string;
  rate: number;
  miles: number;
  notes?: string;
}

export interface BookPayload {
  loadId: string;
  truckNumber: string;
  driverName: string;
}

export interface DecidePayload {
  loadId: string;
  decision: 'accept' | 'deny';
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

export interface LoadFilters {
  status?: LoadStatus;
  customer?: string;
  dispatcher?: string;
  accountManager?: string;
  from?: string;
  to?: string;
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
  return unwrap<LoadRecord[]>(`/api/loads${toQuery(filters)}`);
}

export async function createLoad(payload: CreateLoadPayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>('/api/loads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bookLoad(payload: BookPayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>('/api/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function decideLoad(payload: DecidePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/loads/${payload.loadId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      decision: payload.decision,
      notes: payload.notes,
      requestedPickupDate: payload.requestedPickupDate,
      newDeliveryDate: payload.newDeliveryDate,
      loadRefNumber: payload.loadRefNumber,
      mcleodOrderId: payload.mcleodOrderId,
    }),
  });
}

export async function quoteLoad(payload: QuotePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/loads/${payload.loadId}/quote`, {
    method: 'POST',
    body: JSON.stringify({
      pickupDate: payload.pickupDate,
    }),
  });
}

export async function updateLoadStatus(loadId: string, status: LoadStatus, reason?: string): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/loads/${loadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export async function getGreenbush(): Promise<GreenbushRecord[]> {
  return unwrap<GreenbushRecord[]>('/api/greenbush');
}

export async function quoteGreenbush(payload: GreenbushQuotePayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>('/api/greenbush/quote', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCustomers(): Promise<CustomerRecord[]> {
  return unwrap<CustomerRecord[]>('/api/customers');
}

export async function getUsers(): Promise<UserRecord[]> {
  return unwrap<UserRecord[]>('/api/users');
}

export async function updateLoad(loadId: string, payload: UpdateLoadPayload): Promise<LoadRecord> {
  return unwrap<LoadRecord>(`/api/loads/${loadId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createCustomer(payload: {
  name: string;
  type: 'Direct Customer' | 'Broker';
  quoteAccept: boolean;
}): Promise<CustomerRecord> {
  return unwrap<CustomerRecord>('/api/customers', {
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
  return unwrap<CustomerRecord>(`/api/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  return unwrap<void>(`/api/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function createUser(payload: { email: string; name: string; role: UserRecord['role'] }): Promise<UserRecord> {
  return unwrap<UserRecord>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  userId: string,
  payload: { email: string; name: string; role: UserRecord['role'] },
): Promise<UserRecord> {
  return unwrap<UserRecord>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return unwrap<void>(`/api/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function banUser(userId: string): Promise<UserRecord> {
  return unwrap<UserRecord>(`/api/users/${userId}/ban`, {
    method: 'POST',
  });
}

export async function createGreenbush(payload: GreenbushMutationPayload): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>('/api/greenbush', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGreenbush(greenbushId: string, payload: GreenbushMutationPayload): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>(`/api/greenbush/${greenbushId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function bulkReplaceGreenbush(rows: GreenbushMutationPayload[]): Promise<GreenbushRecord[]> {
  return unwrap<GreenbushRecord[]>('/api/greenbush/bulk-replace', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export async function incrementGreenbush(greenbushId: string): Promise<GreenbushRecord> {
  return unwrap<GreenbushRecord>(`/api/greenbush/${greenbushId}/increment`, {
    method: 'POST',
  });
}

export async function getInitialData(): Promise<InitialDataPayload> {
  return unwrap<InitialDataPayload>('/api/initial-data');
}
