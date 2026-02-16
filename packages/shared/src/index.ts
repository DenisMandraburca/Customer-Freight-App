export const USER_ROLES = [
  'ADMIN',
  'MANAGER',
  'ACCOUNT_MANAGER',
  'DISPATCHER',
  'VIEWER',
  'BANNED',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const LOAD_STATUSES = [
  'AVAILABLE',
  'PENDING_APPROVAL',
  'QUOTE_SUBMITTED',
  'COVERED',
  'LOADED',
  'DELAYED',
  'DELIVERED',
  'BROKERAGE',
  'CANCELED',
  'TONU',
] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export interface SessionUser {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface CreateLoadInput {
  customerId: string;
  accountManagerId: string;
  loadRefNumber: string;
  mcleodOrderId?: string;
  puCity: string;
  puState: string;
  puZip?: string;
  puDate?: string;
  puApptTime?: string;
  puAppt?: boolean;
  delCity: string;
  delState: string;
  delZip?: string;
  delDate?: string;
  delApptTime?: string;
  delAppt?: boolean;
  rate: number;
  miles: number;
  notes?: string;
  status?: LoadStatus;
}

export interface BookLoadInput {
  loadId: string;
  dispatcherId: string;
  truckNumber: string;
  driverName: string;
}

export interface DecideLoadInput {
  loadId: string;
  decision: 'accept' | 'deny';
  notes?: string;
  requestedPickupDate?: string;
  newDeliveryDate?: string;
  loadRefNumber?: string;
  mcleodOrderId?: string;
}

export const COMPANY_DOMAINS = ['afctransport.com', 'afclogistics.com'] as const;

export type CompanyDomain = (typeof COMPANY_DOMAINS)[number];

export function toLoadStatusLabel(status: LoadStatus): string {
  const map: Record<LoadStatus, string> = {
    AVAILABLE: 'Available',
    PENDING_APPROVAL: 'Pending Approval',
    QUOTE_SUBMITTED: 'Quote Submitted',
    COVERED: 'Covered',
    LOADED: 'Loaded',
    DELAYED: 'Delayed',
    DELIVERED: 'Delivered',
    BROKERAGE: 'Brokerage',
    CANCELED: 'Canceled',
    TONU: 'TONU',
  };

  return map[status];
}
