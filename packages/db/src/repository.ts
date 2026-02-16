import { randomUUID } from 'node:crypto';

import type { LoadStatus, UserRole } from '@antigravity/shared';

import type { Database, QueryExecutor } from './client.js';

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  type: 'Direct Customer' | 'Broker';
  quote_accept: boolean;
  total_delivered?: number;
  total_rate_delivered?: string;
  total_canceled?: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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

export interface LoadFilters {
  status?: LoadStatus;
  customer?: string;
  dispatcher?: string;
  accountManager?: string;
  from?: string;
  to?: string;
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

export interface BookInput {
  loadId: string;
  dispatcherId: string;
  truckNumber: string;
  driverName: string;
}

export interface QuoteInput {
  loadId: string;
  dispatcherId: string;
  pickupDate: string;
}

export interface DecideInput {
  loadId: string;
  decision: 'accept' | 'deny';
  notes?: string;
  requestedPickupDate?: string;
  newDeliveryDate?: string;
  loadRefNumber?: string;
  mcleodOrderId?: string;
}

export interface GreenbushQuoteInput {
  greenbushId: string;
  dispatcherId: string;
  pickupDate: string;
  truckNumber: string;
  driverName?: string;
}

export interface GreenbushMutationInput {
  pickupLocation: string;
  destination: string;
  receivingHours?: string;
  price: number;
  tarp?: string;
  remainingCount: number;
  specialNotes?: string;
}

export interface CustomerMutationInput {
  name: string;
  type: 'Direct Customer' | 'Broker';
  quoteAccept: boolean;
}

export interface UserMutationInput {
  email: string;
  name: string;
  role: UserRole;
}

export interface UpdateLoadInput {
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
  status?: LoadStatus;
  notes?: string | null;
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

function asNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new HttpError(`${field} must be a valid number.`, 400);
  }
  return value;
}

function calculateRpm(rate: number, miles: number): number {
  const safeRate = asNumber(rate, 'rate');
  const safeMiles = asNumber(miles, 'miles');

  if (safeMiles <= 0) {
    throw new HttpError('Miles must be greater than zero.', 400);
  }

  return Number((safeRate / safeMiles).toFixed(2));
}

function appendReason(existingReason: string | null, status: LoadStatus, reason?: string): string {
  const timestamp = new Date().toISOString();
  const next = `[${timestamp}] ${status}${reason ? `: ${reason}` : ''}`;
  return [existingReason?.trim(), next].filter(Boolean).join('\n');
}

async function ensureGreenbushCustomer(tx: QueryExecutor): Promise<string> {
  const existing = await tx.query<{ id: string }>(
    `select id from customers where lower(name) = lower($1) limit 1`,
    ['Greenbush'],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0]!.id;
  }

  const created = await tx.query<{ id: string }>(
    `insert into customers (id, name, type, quote_accept)
     values ($1, $2, $3, $4)
     returning id`,
    [randomUUID(), 'Greenbush', 'Direct Customer', true],
  );

  return created.rows[0]!.id;
}

const LOAD_SELECT = `
  select
    l.id,
    l.legacy_id,
    l.created_at,
    l.status,
    l.account_manager_id,
    l.customer_id,
    l.load_ref_number,
    l.mcleod_order_id,
    l.requested_pickup_date::text as requested_pickup_date,
    l.pu_city,
    l.pu_state,
    l.pu_zip,
    l.pu_date::text as pu_date,
    l.pu_appt_time,
    l.pu_appt,
    l.del_city,
    l.del_state,
    l.del_zip,
    l.del_date::text as del_date,
    l.del_appt_time,
    l.del_appt,
    l.rate,
    l.miles,
    l.rpm,
    l.notes,
    l.equipment,
    l.assigned_dispatcher_id,
    l.driver_name,
    l.truck_number,
    l.reason_log,
    l.delay_reason,
    l.cancel_reason,
    l.deny_quote_reason,
    l.other_notes,
    l.greenbush_bank_id,
    c.name as customer_name,
    c.quote_accept as customer_quote_accept,
    am.name as account_manager_name,
    d.name as dispatcher_name
  from loads l
  left join customers c on c.id = l.customer_id
  left join users am on am.id = l.account_manager_id
  left join users d on d.id = l.assigned_dispatcher_id
`;

export class FreightRepository {
  constructor(private readonly db: Database) {}

  async upsertUserFromGoogle(email: string, name: string): Promise<UserRecord> {
    const existing = await this.db.query<UserRecord>(
      `select * from users where lower(email) = lower($1) limit 1`,
      [email],
    );

    if (existing.rowCount > 0) {
      const updated = await this.db.query<UserRecord>(
        `update users set name = $2 where id = $1 returning *`,
        [existing.rows[0]!.id, name],
      );

      return updated.rows[0]!;
    }

    const created = await this.db.query<UserRecord>(
      `insert into users (id, email, name, role)
       values ($1, $2, $3, $4)
       returning *`,
      [randomUUID(), email.toLowerCase(), name, 'VIEWER'],
    );

    return created.rows[0]!;
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(`select * from users where id = $1`, [userId]);
    return result.rows[0] ?? null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(`select * from users where lower(email) = lower($1)`, [email]);
    return result.rows[0] ?? null;
  }

  async listUsers(): Promise<UserRecord[]> {
    const result = await this.db.query<UserRecord>(`select * from users order by created_at desc`);
    return result.rows;
  }

  async listCustomers(): Promise<CustomerRecord[]> {
    const result = await this.db.query<CustomerRecord>(
      `select
         c.*,
         count(l.id) filter (where l.status in ('DELIVERED', 'BROKERAGE'))::int as total_delivered,
         coalesce(sum(case when l.status in ('DELIVERED', 'BROKERAGE') then l.rate else 0 end), 0)::numeric(12,2) as total_rate_delivered,
         count(l.id) filter (where l.status in ('CANCELED', 'TONU'))::int as total_canceled
       from customers c
       left join loads l on l.customer_id = c.id
       group by c.id
       order by c.name asc`,
    );
    return result.rows;
  }

  async createCustomer(payload: CustomerMutationInput): Promise<CustomerRecord> {
    const result = await this.db.query<CustomerRecord>(
      `insert into customers (id, name, type, quote_accept)
       values ($1, $2, $3, $4)
       returning *`,
      [randomUUID(), payload.name.trim(), payload.type, payload.quoteAccept],
    );

    return result.rows[0]!;
  }

  async updateCustomer(customerId: string, payload: CustomerMutationInput): Promise<CustomerRecord> {
    const result = await this.db.query<CustomerRecord>(
      `update customers
       set name = $2, type = $3, quote_accept = $4
       where id = $1
       returning *`,
      [customerId, payload.name.trim(), payload.type, payload.quoteAccept],
    );

    if (result.rowCount === 0) {
      throw new HttpError('Customer not found.', 404);
    }

    return result.rows[0]!;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const result = await this.db.query(`delete from customers where id = $1`, [customerId]);
    if (result.rowCount === 0) {
      throw new HttpError('Customer not found.', 404);
    }
  }

  async createUser(payload: UserMutationInput): Promise<UserRecord> {
    const result = await this.db.query<UserRecord>(
      `insert into users (id, email, name, role)
       values ($1, $2, $3, $4)
       returning *`,
      [randomUUID(), payload.email.toLowerCase(), payload.name.trim(), payload.role],
    );

    return result.rows[0]!;
  }

  async updateUser(userId: string, payload: UserMutationInput): Promise<UserRecord> {
    const result = await this.db.query<UserRecord>(
      `update users
       set email = $2, name = $3, role = $4
       where id = $1
       returning *`,
      [userId, payload.email.toLowerCase(), payload.name.trim(), payload.role],
    );

    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404);
    }

    return result.rows[0]!;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.db.query(`delete from users where id = $1`, [userId]);
    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404);
    }
  }

  async banUser(userId: string): Promise<UserRecord> {
    const result = await this.db.query<UserRecord>(
      `update users
       set role = 'BANNED'
       where id = $1
       returning *`,
      [userId],
    );

    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404);
    }

    return result.rows[0]!;
  }

  async listGreenbush(): Promise<GreenbushRecord[]> {
    const result = await this.db.query<GreenbushRecord>(
      `select * from greenbush_bank order by created_at desc`,
    );

    return result.rows;
  }

  async createGreenbush(payload: GreenbushMutationInput): Promise<GreenbushRecord> {
    if (!payload.pickupLocation.trim() || !payload.destination.trim()) {
      throw new HttpError('pickupLocation and destination are required.', 400);
    }

    if (!Number.isInteger(payload.remainingCount) || payload.remainingCount < 0) {
      throw new HttpError('remainingCount must be an integer >= 0.', 400);
    }

    const result = await this.db.query<GreenbushRecord>(
      `insert into greenbush_bank (
        id,
        pickup_location,
        destination,
        receiving_hours,
        price,
        tarp,
        remaining_count,
        special_notes
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *`,
      [
        randomUUID(),
        payload.pickupLocation.trim(),
        payload.destination.trim(),
        payload.receivingHours?.trim() || null,
        asNumber(payload.price, 'price'),
        payload.tarp?.trim() || null,
        payload.remainingCount,
        payload.specialNotes?.trim() || null,
      ],
    );

    return result.rows[0]!;
  }

  async updateGreenbush(id: string, payload: GreenbushMutationInput): Promise<GreenbushRecord> {
    const result = await this.db.query<GreenbushRecord>(
      `update greenbush_bank
       set pickup_location = $2,
           destination = $3,
           receiving_hours = $4,
           price = $5,
           tarp = $6,
           remaining_count = $7,
           special_notes = $8
       where id = $1
       returning *`,
      [
        id,
        payload.pickupLocation.trim(),
        payload.destination.trim(),
        payload.receivingHours?.trim() || null,
        asNumber(payload.price, 'price'),
        payload.tarp?.trim() || null,
        payload.remainingCount,
        payload.specialNotes?.trim() || null,
      ],
    );

    if (result.rowCount === 0) {
      throw new HttpError('Greenbush record not found.', 404);
    }

    return result.rows[0]!;
  }

  async incrementGreenbush(greenbushId: string): Promise<GreenbushRecord> {
    const result = await this.db.query<GreenbushRecord>(
      `update greenbush_bank
       set remaining_count = remaining_count + 1
       where id = $1
       returning *`,
      [greenbushId],
    );

    if (result.rowCount === 0) {
      throw new HttpError('Greenbush record not found.', 404);
    }

    return result.rows[0]!;
  }

  async bulkReplaceGreenbush(rows: GreenbushMutationInput[]): Promise<GreenbushRecord[]> {
    if (!rows.length) {
      throw new HttpError('rows must contain at least one Greenbush record.', 400);
    }

    return this.db.withTransaction(async (tx) => {
      await tx.query(`delete from greenbush_bank`);

      const inserted: GreenbushRecord[] = [];
      for (const row of rows) {
        if (!row.pickupLocation.trim() || !row.destination.trim()) {
          throw new HttpError('pickupLocation and destination are required.', 400);
        }
        if (!Number.isInteger(row.remainingCount) || row.remainingCount < 0) {
          throw new HttpError('remainingCount must be an integer >= 0.', 400);
        }

        const result = await tx.query<GreenbushRecord>(
          `insert into greenbush_bank (
             id,
             pickup_location,
             destination,
             receiving_hours,
             price,
             tarp,
             remaining_count,
             special_notes
           ) values ($1,$2,$3,$4,$5,$6,$7,$8)
           returning *`,
          [
            randomUUID(),
            row.pickupLocation.trim(),
            row.destination.trim(),
            row.receivingHours?.trim() || null,
            asNumber(row.price, 'price'),
            row.tarp?.trim() || null,
            row.remainingCount,
            row.specialNotes?.trim() || null,
          ],
        );
        inserted.push(result.rows[0]!);
      }

      return inserted;
    });
  }

  async getLoadById(loadId: string): Promise<LoadRecord | null> {
    const result = await this.db.query<LoadRecord>(
      `${LOAD_SELECT}
       where l.id = $1
       limit 1`,
      [loadId],
    );

    return result.rows[0] ?? null;
  }

  async listLoads(filters: LoadFilters): Promise<LoadRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      params.push(filters.status);
      clauses.push(`l.status = $${params.length}`);
    }

    if (filters.customer) {
      const customerTerm = filters.customer.trim();
      params.push(customerTerm);
      params.push(`%${customerTerm}%`);
      clauses.push(`(c.id::text = $${params.length - 1} or c.name ilike $${params.length})`);
    }

    if (filters.dispatcher) {
      const dispatcherTerm = filters.dispatcher.trim();
      params.push(dispatcherTerm);
      params.push(`%${dispatcherTerm}%`);
      clauses.push(`(d.id::text = $${params.length - 1} or d.name ilike $${params.length})`);
    }

    if (filters.accountManager) {
      const accountManagerTerm = filters.accountManager.trim();
      params.push(accountManagerTerm);
      params.push(`%${accountManagerTerm}%`);
      clauses.push(`(am.id::text = $${params.length - 1} or am.name ilike $${params.length})`);
    }

    if (filters.from) {
      params.push(filters.from);
      clauses.push(`l.pu_date >= $${params.length}`);
    }

    if (filters.to) {
      params.push(filters.to);
      clauses.push(`l.pu_date <= $${params.length}`);
    }

    const where = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';

    const result = await this.db.query<LoadRecord>(
      `${LOAD_SELECT}
       ${where}
       order by l.created_at desc`,
      params,
    );

    return result.rows;
  }

  async createLoad(input: CreateLoadInput): Promise<LoadRecord> {
    const rate = asNumber(input.rate, 'rate');
    const miles = asNumber(input.miles, 'miles');
    const rpm = calculateRpm(rate, miles);

    const loadId = randomUUID();

    await this.db.query(
      `insert into loads (
        id,
        status,
        account_manager_id,
        customer_id,
        load_ref_number,
        mcleod_order_id,
        pu_city,
        pu_state,
        pu_zip,
        pu_date,
        pu_appt_time,
        pu_appt,
        del_city,
        del_state,
        del_zip,
        del_date,
        del_appt_time,
        del_appt,
        rate,
        miles,
        rpm,
        notes
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )`,
      [
        loadId,
        input.status ?? 'AVAILABLE',
        input.accountManagerId,
        input.customerId,
        input.loadRefNumber.trim(),
        input.mcleodOrderId?.trim() || null,
        input.puCity.trim(),
        input.puState.trim().toUpperCase(),
        input.puZip?.trim() || null,
        input.puDate || null,
        input.puApptTime?.trim() || null,
        input.puAppt ?? false,
        input.delCity.trim(),
        input.delState.trim().toUpperCase(),
        input.delZip?.trim() || null,
        input.delDate || null,
        input.delApptTime?.trim() || null,
        input.delAppt ?? false,
        rate,
        miles,
        rpm,
        input.notes?.trim() || null,
      ],
    );

    const load = await this.getLoadById(loadId);
    if (!load) {
      throw new HttpError('Load creation failed.', 500);
    }

    return load;
  }

  async bookLoad(input: BookInput): Promise<LoadRecord> {
    if (!input.truckNumber.trim() || !input.driverName.trim()) {
      throw new HttpError('Truck number and driver name are required.', 400);
    }

    const existing = await this.getLoadById(input.loadId);
    const update = await this.db.query<{ id: string }>(
      `update loads
       set status = 'PENDING_APPROVAL',
           assigned_dispatcher_id = $2,
           truck_number = $3,
           driver_name = $4,
           reason_log = $5
       where id = $1
         and status = 'AVAILABLE'
       returning id`,
      [
        input.loadId,
        input.dispatcherId,
        input.truckNumber.trim(),
        input.driverName.trim(),
        appendReason(existing?.reason_log ?? null, 'PENDING_APPROVAL', 'Dispatcher booked load'),
      ],
    );

    if (update.rowCount === 0) {
      throw new HttpError('Load is no longer available for booking.', 409);
    }

    const load = await this.getLoadById(input.loadId);
    if (!load) {
      throw new HttpError('Booked load not found.', 404);
    }

    return load;
  }

  async quoteLoad(input: QuoteInput): Promise<LoadRecord> {
    if (!input.pickupDate.trim()) {
      throw new HttpError('pickupDate is required.', 400);
    }

    const existing = await this.getLoadById(input.loadId);
    if (!existing) {
      throw new HttpError('Load not found.', 404);
    }

    if (existing.status !== 'AVAILABLE') {
      throw new HttpError('Load is no longer available for quote submission.', 409);
    }

    if (!existing.customer_quote_accept) {
      throw new HttpError('Quotes are not enabled for this customer.', 409);
    }

    const reason = `Requested Pickup Date Change to ${input.pickupDate.trim()}`;
    const update = await this.db.query<{ id: string }>(
      `update loads
       set status = 'QUOTE_SUBMITTED',
           assigned_dispatcher_id = $2,
           requested_pickup_date = $3,
           reason_log = $4
       where id = $1
         and status = 'AVAILABLE'
       returning id`,
      [
        input.loadId,
        input.dispatcherId,
        input.pickupDate.trim(),
        appendReason(existing.reason_log, 'QUOTE_SUBMITTED', reason),
      ],
    );

    if (update.rowCount === 0) {
      throw new HttpError('Load is no longer available for quote submission.', 409);
    }

    const load = await this.getLoadById(input.loadId);
    if (!load) {
      throw new HttpError('Quoted load not found.', 404);
    }

    return load;
  }

  async updateLoadStatus(loadId: string, status: LoadStatus, reason?: string): Promise<LoadRecord> {
    const existing = await this.getLoadById(loadId);

    if (!existing) {
      throw new HttpError('Load not found.', 404);
    }

    if (status === 'DELAYED' && !reason?.trim()) {
      throw new HttpError('A delay reason is required when setting status to DELAYED.', 400);
    }

    if (status === 'CANCELED' && !reason?.trim()) {
      throw new HttpError('A cancel reason is required when setting status to CANCELED.', 400);
    }

    if (status === 'DELAYED' && !['COVERED', 'LOADED'].includes(existing.status)) {
      throw new HttpError('Only COVERED/LOADED loads can be marked DELAYED.', 409);
    }

    if (status === 'CANCELED' && !['COVERED', 'LOADED', 'DELAYED'].includes(existing.status)) {
      throw new HttpError('Only COVERED/LOADED/DELAYED loads can be marked CANCELED.', 409);
    }

    if (status === 'LOADED' && !['COVERED', 'DELAYED'].includes(existing.status)) {
      throw new HttpError('Only COVERED/DELAYED loads can be marked LOADED.', 409);
    }

    if (status === 'DELIVERED' && !['LOADED', 'DELAYED'].includes(existing.status)) {
      throw new HttpError('Only LOADED/DELAYED loads can be marked DELIVERED.', 409);
    }

    const nextReasonLog = appendReason(existing.reason_log, status, reason);

    const result = await this.db.query<{ id: string }>(
      `update loads
       set status = $2::load_status,
           reason_log = $3,
           delay_reason = case when $2::load_status = 'DELAYED'::load_status then $4 else delay_reason end,
           cancel_reason = case when $2::load_status = 'CANCELED'::load_status then $5 else cancel_reason end
       where id = $1
       returning id`,
      [loadId, status, nextReasonLog, reason?.trim() || null, reason?.trim() || null],
    );

    if (result.rowCount === 0) {
      throw new HttpError('Load status update failed.', 500);
    }

    const load = await this.getLoadById(loadId);
    if (!load) {
      throw new HttpError('Updated load not found.', 404);
    }

    return load;
  }

  async decideLoad(input: DecideInput): Promise<LoadRecord> {
    return this.db.withTransaction(async (tx) => {
      const existing = await tx.query<{
        id: string;
        status: LoadStatus;
        greenbush_bank_id: string | null;
        requested_pickup_date: string | null;
        reason_log: string | null;
      }>(
        `select id, status, greenbush_bank_id, requested_pickup_date::text as requested_pickup_date, reason_log
         from loads
         where id = $1`,
        [input.loadId],
      );

      if (existing.rowCount === 0) {
        throw new HttpError('Load not found.', 404);
      }

      const load = existing.rows[0]!;
      const note = input.notes?.trim() || null;

      if (input.decision === 'accept') {
        if (!['PENDING_APPROVAL', 'QUOTE_SUBMITTED'].includes(load.status)) {
          throw new HttpError('Only pending/quote-submitted loads can be accepted.', 409);
        }

        const requestedPickupDate = input.requestedPickupDate?.trim() || load.requested_pickup_date || null;
        const newDeliveryDate = input.newDeliveryDate?.trim() || null;

        if (load.status === 'QUOTE_SUBMITTED' && !newDeliveryDate) {
          throw new HttpError('newDeliveryDate is required when accepting a quote-submitted load.', 400);
        }

        await tx.query(
          `update loads
           set status = 'COVERED'::load_status,
               other_notes = $2,
               pu_date = coalesce($4::date, pu_date),
               del_date = coalesce($5::date, del_date),
               load_ref_number = case when $6::text is not null and $6::text <> '' then $6::text else load_ref_number end,
               mcleod_order_id = case when $7::text is not null and $7::text <> '' then $7::text else mcleod_order_id end,
               reason_log = $3
           where id = $1`,
          [
            input.loadId,
            note,
            appendReason(load.reason_log, 'COVERED', note ?? undefined),
            requestedPickupDate,
            newDeliveryDate,
            input.loadRefNumber?.trim() || null,
            input.mcleodOrderId?.trim() || null,
          ],
        );
      } else {
        if (!['PENDING_APPROVAL', 'QUOTE_SUBMITTED'].includes(load.status)) {
          throw new HttpError('Only pending/quote-submitted loads can be denied.', 409);
        }

        if (load.greenbush_bank_id) {
          await tx.query(
            `update greenbush_bank
             set remaining_count = remaining_count + 1
             where id = $1`,
            [load.greenbush_bank_id],
          );
        }

        await tx.query(
          `update loads
           set status = 'AVAILABLE'::load_status,
               assigned_dispatcher_id = null,
               truck_number = null,
               driver_name = null,
               requested_pickup_date = null,
               deny_quote_reason = case when $4 = 'QUOTE_SUBMITTED' then $2 else deny_quote_reason end,
               reason_log = $3
           where id = $1`,
          [
            input.loadId,
            note,
            appendReason(load.reason_log, 'AVAILABLE', note ?? undefined),
            load.status,
          ],
        );
      }

      const refreshed = await tx.query<LoadRecord>(
        `${LOAD_SELECT}
         where l.id = $1
         limit 1`,
        [input.loadId],
      );

      if (refreshed.rowCount === 0) {
        throw new HttpError('Decided load not found.', 404);
      }

      return refreshed.rows[0]!;
    });
  }

  async createGreenbushQuote(input: GreenbushQuoteInput): Promise<LoadRecord> {
    return this.db.withTransaction(async (tx) => {
      const gb = await tx.query<GreenbushRecord>(
        `update greenbush_bank
         set remaining_count = remaining_count - 1
         where id = $1
           and remaining_count > 0
         returning *`,
        [input.greenbushId],
      );

      if (gb.rowCount === 0) {
        const exists = await tx.query<{ id: string }>('select id from greenbush_bank where id = $1', [input.greenbushId]);
        if (exists.rowCount === 0) {
          throw new HttpError('Greenbush record not found.', 404);
        }
        throw new HttpError('No remaining Greenbush capacity for this job.', 409);
      }

      const greenbush = gb.rows[0]!;

      const customerId = await ensureGreenbushCustomer(tx);

      const loadId = randomUUID();
      const rate = Number(greenbush.price);
      const miles = 1;
      const rpm = calculateRpm(rate, miles);

      await tx.query(
        `insert into loads (
          id,
          status,
          customer_id,
          load_ref_number,
          requested_pickup_date,
          pu_city,
          pu_state,
          pu_date,
          del_city,
          del_state,
          rate,
          miles,
          rpm,
          notes,
          assigned_dispatcher_id,
          driver_name,
          truck_number,
          greenbush_bank_id,
          reason_log
        ) values (
          $1,'QUOTE_SUBMITTED',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )`,
        [
          loadId,
          customerId,
          `GB-Q-${Date.now()}`,
          input.pickupDate,
          greenbush.pickup_location,
          'NA',
          input.pickupDate,
          greenbush.destination,
          'NA',
          rate,
          miles,
          rpm,
          greenbush.special_notes,
          input.dispatcherId,
          input.driverName?.trim() || null,
          input.truckNumber.trim(),
          input.greenbushId,
          `[${new Date().toISOString()}] QUOTE_SUBMITTED: Greenbush quote created`,
        ],
      );

      const refreshed = await tx.query<LoadRecord>(
        `${LOAD_SELECT}
         where l.id = $1`,
        [loadId],
      );

      return refreshed.rows[0]!;
    });
  }

  async updateLoad(loadId: string, updates: UpdateLoadInput): Promise<LoadRecord> {
    const entries: Array<[string, unknown]> = [];

    if (updates.customerId !== undefined) entries.push(['customer_id', updates.customerId]);
    if (updates.accountManagerId !== undefined) entries.push(['account_manager_id', updates.accountManagerId]);
    if (updates.loadRefNumber !== undefined) entries.push(['load_ref_number', updates.loadRefNumber.trim()]);
    if (updates.mcleodOrderId !== undefined) entries.push(['mcleod_order_id', updates.mcleodOrderId?.trim() || null]);
    if (updates.puCity !== undefined) entries.push(['pu_city', updates.puCity.trim()]);
    if (updates.puState !== undefined) entries.push(['pu_state', updates.puState.trim().toUpperCase()]);
    if (updates.puZip !== undefined) entries.push(['pu_zip', updates.puZip?.trim() || null]);
    if (updates.puDate !== undefined) entries.push(['pu_date', updates.puDate || null]);
    if (updates.puApptTime !== undefined) entries.push(['pu_appt_time', updates.puApptTime?.trim() || null]);
    if (updates.puAppt !== undefined) entries.push(['pu_appt', updates.puAppt]);
    if (updates.delCity !== undefined) entries.push(['del_city', updates.delCity.trim()]);
    if (updates.delState !== undefined) entries.push(['del_state', updates.delState.trim().toUpperCase()]);
    if (updates.delZip !== undefined) entries.push(['del_zip', updates.delZip?.trim() || null]);
    if (updates.delDate !== undefined) entries.push(['del_date', updates.delDate || null]);
    if (updates.delApptTime !== undefined) entries.push(['del_appt_time', updates.delApptTime?.trim() || null]);
    if (updates.delAppt !== undefined) entries.push(['del_appt', updates.delAppt]);
    if (updates.status !== undefined) entries.push(['status', updates.status]);
    if (updates.notes !== undefined) entries.push(['notes', updates.notes?.trim() || null]);
    if (updates.assignedDispatcherId !== undefined) entries.push(['assigned_dispatcher_id', updates.assignedDispatcherId]);
    if (updates.driverName !== undefined) entries.push(['driver_name', updates.driverName?.trim() || null]);
    if (updates.truckNumber !== undefined) entries.push(['truck_number', updates.truckNumber?.trim() || null]);
    if (updates.equipment !== undefined) entries.push(['equipment', updates.equipment?.trim() || null]);
    if (updates.otherNotes !== undefined) entries.push(['other_notes', updates.otherNotes?.trim() || null]);
    if (updates.delayReason !== undefined) entries.push(['delay_reason', updates.delayReason?.trim() || null]);
    if (updates.cancelReason !== undefined) entries.push(['cancel_reason', updates.cancelReason?.trim() || null]);
    if (updates.denyQuoteReason !== undefined) entries.push(['deny_quote_reason', updates.denyQuoteReason?.trim() || null]);
    if (updates.requestedPickupDate !== undefined) entries.push(['requested_pickup_date', updates.requestedPickupDate || null]);

    let computedRpm: number | null = null;
    const current = await this.getLoadById(loadId);
    if (!current) {
      throw new HttpError('Load not found.', 404);
    }

    if (
      updates.assignedDispatcherId !== undefined &&
      updates.assignedDispatcherId !== null &&
      current.status === 'AVAILABLE' &&
      updates.status === undefined
    ) {
      entries.push(['status', 'COVERED']);
    }

    if (updates.rate !== undefined || updates.miles !== undefined) {
      const rate = updates.rate ?? Number(current.rate);
      const miles = updates.miles ?? Number(current.miles);

      if (rate !== undefined) entries.push(['rate', asNumber(rate, 'rate')]);
      if (miles !== undefined) entries.push(['miles', asNumber(miles, 'miles')]);
      computedRpm = calculateRpm(rate, miles);
      entries.push(['rpm', computedRpm]);
    }

    if (entries.length === 0) {
      return current;
    }

    const assignments = entries.map(([column], index) => `${column} = $${index + 2}`);
    const params = [loadId, ...entries.map(([, value]) => value)];

    const result = await this.db.query<{ id: string }>(
      `update loads set ${assignments.join(', ')} where id = $1 returning id`,
      params,
    );

    if (result.rowCount === 0) {
      throw new HttpError('Load not found.', 404);
    }

    const refreshed = await this.getLoadById(loadId);
    if (!refreshed) {
      throw new HttpError('Updated load not found.', 404);
    }

    return refreshed;
  }

  async bootstrapDefaults(): Promise<void> {
    await this.db.withTransaction(async (tx) => {
      await ensureGreenbushCustomer(tx);
    });
  }
}
