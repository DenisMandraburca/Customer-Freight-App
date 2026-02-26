import { randomUUID } from 'node:crypto';

import type { LoadStatus, UserRole } from '@antigravity/shared';

import type { Database, QueryExecutor } from './client.js';
import type { DbDialect } from './dbConfig.js';
import { ciLike, dateAsText, greatest, idEquals, sqlByDialect } from './sqlDialect.js';

export class HttpError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  full_load_access: boolean;
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
  reserved_count: number;
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
  ref?: string;
}

export interface CreateLoadInput {
  customerId: string;
  accountManagerId: string;
  loadRefNumber?: string;
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
  actorName?: string;
  assignedDispatcherId?: string | null;
  driverName?: string | null;
  truckNumber?: string | null;
  status?: LoadStatus;
}

export interface BookInput {
  loadId: string;
  dispatcherId: string;
  truckNumber: string;
  driverName: string;
  actorName: string;
}

export interface QuoteInput {
  loadId: string;
  dispatcherId: string;
  pickupDate: string;
  actorName: string;
}

export interface DecideInput {
  loadId: string;
  decision: 'accept' | 'deny';
  denyReason?: string;
  actorName: string;
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
  fullLoadAccess?: boolean;
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
  actorName?: string;
}

function asNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new HttpError(`${field} must be a valid number.`, 400, 'VALIDATION_ERROR');
  }
  return value;
}

function calculateRpm(rate: number, miles: number): number {
  const safeRate = asNumber(rate, 'rate');
  const safeMiles = asNumber(miles, 'miles');

  if (safeMiles <= 0) {
    return 0;
  }

  return Number((safeRate / safeMiles).toFixed(2));
}

function validateMilesForStatus(miles: number, status: LoadStatus): void {
  const safeMiles = asNumber(miles, 'miles');
  if (safeMiles < 0) {
    throw new HttpError('miles cannot be negative.', 400, 'VALIDATION_ERROR');
  }
  if (safeMiles === 0 && status !== 'TONU') {
    throw new HttpError('Miles can be 0 only when status is TONU.', 400, 'VALIDATION_ERROR');
  }
}

function formatAuditTimestamp(date = new Date()): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = date.getFullYear();
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function appendReasonLine(existingReason: string | null, message: string): string {
  const next = `[${formatAuditTimestamp()}] ${message}`;
  return [existingReason?.trim(), next].filter(Boolean).join('\n');
}

function replaceLastQuoteLine(reasonLog: string | null, replacement: string): string | null {
  if (!reasonLog?.trim()) {
    return reasonLog;
  }

  const lines = reasonLog.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.includes('Quote:')) {
      lines[index] = lines[index]!.replace(/Quote:.*/, replacement);
      return lines.join('\n').trim();
    }
  }

  return reasonLog;
}

async function ensureGreenbushCustomer(tx: QueryExecutor, dialect: DbDialect): Promise<string> {
  const existing = await tx.query<{ id: string }>(
    `select id from customers where lower(name) = lower($1) limit 1`,
    ['Greenbush'],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0]!.id;
  }

  const id = randomUUID();

  if (dialect === 'sqlite') {
    await tx.query(
      `insert into customers (id, name, type, quote_accept)
       values ($1, $2, $3, $4)`,
      [id, 'Greenbush', 'Direct Customer', true],
    );
    return id;
  }

  const created = await tx.query<{ id: string }>(
    `insert into customers (id, name, type, quote_accept)
     values ($1, $2, $3, $4)
     returning id`,
    [id, 'Greenbush', 'Direct Customer', true],
  );

  return created.rows[0]!.id;
}

function buildLoadSelect(dialect: DbDialect): string {
  return `
    select
      l.id,
      l.legacy_id,
      l.created_at,
      l.status,
      l.account_manager_id,
      l.customer_id,
      l.load_ref_number,
      l.mcleod_order_id,
      ${dateAsText(dialect, 'l.requested_pickup_date', 'requested_pickup_date')},
      l.pu_city,
      l.pu_state,
      l.pu_zip,
      ${dateAsText(dialect, 'l.pu_date', 'pu_date')},
      l.pu_appt_time,
      l.pu_appt,
      l.del_city,
      l.del_state,
      l.del_zip,
      ${dateAsText(dialect, 'l.del_date', 'del_date')},
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
}

export class FreightRepository {
  private readonly dialect: DbDialect;
  private readonly loadSelectSql: string;

  constructor(private readonly db: Database) {
    this.dialect = db.dialect;
    this.loadSelectSql = buildLoadSelect(this.dialect);
  }

  async upsertUserFromGoogle(
    email: string,
    name: string,
    options?: { forcedRole?: UserRole; forcedFullLoadAccess?: boolean },
  ): Promise<UserRecord> {
    const existing = await this.db.query<UserRecord>(
      `select * from users where lower(email) = lower($1) limit 1`,
      [email],
    );

    if (existing.rowCount > 0) {
      const updates: string[] = ['name = $2'];
      const params: unknown[] = [existing.rows[0]!.id, name];

      if (options?.forcedRole) {
        updates.push(`role = $${params.length + 1}`);
        params.push(options.forcedRole);
      }

      if (options?.forcedFullLoadAccess !== undefined) {
        updates.push(`full_load_access = $${params.length + 1}`);
        params.push(options.forcedFullLoadAccess);
      }

      const updateSql = sqlByDialect(this.dialect, {
        postgres: `update users set ${updates.join(', ')} where id = $1 returning *`,
        sqlite: `update users set ${updates.join(', ')} where id = $1`,
      });
      const updated = await this.db.query<UserRecord>(updateSql, params);

      if (this.dialect === 'sqlite') {
        const refreshed = await this.getUserById(existing.rows[0]!.id);
        if (!refreshed) {
          throw new HttpError('User not found.', 404, 'NOT_FOUND');
        }
        return refreshed;
      }

      return updated.rows[0]!;
    }

    const id = randomUUID();
    const createSql = sqlByDialect(this.dialect, {
      postgres: `insert into users (id, email, name, role, full_load_access)
        values ($1, $2, $3, $4, $5)
        returning *`,
      sqlite: `insert into users (id, email, name, role, full_load_access)
        values ($1, $2, $3, $4, $5)`,
    });
    const created = await this.db.query<UserRecord>(createSql, [
      id,
      email.toLowerCase(),
      name,
      options?.forcedRole ?? 'VIEWER',
      options?.forcedFullLoadAccess ?? false,
    ]);

    if (this.dialect === 'sqlite') {
      const refreshed = await this.getUserById(id);
      if (!refreshed) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }
      return refreshed;
    }

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
    const sql = sqlByDialect(this.dialect, {
      postgres: `select
          c.*,
          count(l.id) filter (where l.status in ('DELIVERED', 'BROKERAGE'))::int as total_delivered,
          coalesce(sum(case when l.status in ('DELIVERED', 'BROKERAGE') then l.rate else 0 end), 0)::numeric(12,2) as total_rate_delivered,
          count(l.id) filter (where l.status in ('CANCELED', 'TONU'))::int as total_canceled
        from customers c
        left join loads l on l.customer_id = c.id
        group by c.id
        order by c.name asc`,
      sqlite: `select
          c.*,
          coalesce(sum(case when l.status in ('DELIVERED', 'BROKERAGE') then 1 else 0 end), 0) as total_delivered,
          coalesce(sum(case when l.status in ('DELIVERED', 'BROKERAGE') then l.rate else 0 end), 0) as total_rate_delivered,
          coalesce(sum(case when l.status in ('CANCELED', 'TONU') then 1 else 0 end), 0) as total_canceled
        from customers c
        left join loads l on l.customer_id = c.id
        group by c.id
        order by c.name asc`,
    });
    const result = await this.db.query<CustomerRecord>(sql);
    return result.rows;
  }

  async createCustomer(payload: CustomerMutationInput): Promise<CustomerRecord> {
    const id = randomUUID();
    const sql = sqlByDialect(this.dialect, {
      postgres: `insert into customers (id, name, type, quote_accept)
        values ($1, $2, $3, $4)
        returning *`,
      sqlite: `insert into customers (id, name, type, quote_accept)
        values ($1, $2, $3, $4)`,
    });
    const result = await this.db.query<CustomerRecord>(sql, [id, payload.name.trim(), payload.type, payload.quoteAccept]);

    if (this.dialect === 'sqlite') {
      const refreshed = await this.db.query<CustomerRecord>(`select * from customers where id = $1`, [id]);
      if (refreshed.rowCount === 0) {
        throw new HttpError('Customer not found.', 404, 'NOT_FOUND');
      }
      return refreshed.rows[0]!;
    }

    return result.rows[0]!;
  }

  async updateCustomer(customerId: string, payload: CustomerMutationInput): Promise<CustomerRecord> {
    const sql = sqlByDialect(this.dialect, {
      postgres: `update customers
        set name = $2, type = $3, quote_accept = $4
        where id = $1
        returning *`,
      sqlite: `update customers
        set name = $2, type = $3, quote_accept = $4
        where id = $1`,
    });
    const result = await this.db.query<CustomerRecord>(sql, [
      customerId,
      payload.name.trim(),
      payload.type,
      payload.quoteAccept,
    ]);

    if (result.rowCount === 0) {
      throw new HttpError('Customer not found.', 404, 'NOT_FOUND');
    }

    if (this.dialect === 'sqlite') {
      const refreshed = await this.db.query<CustomerRecord>(`select * from customers where id = $1`, [customerId]);
      if (refreshed.rowCount === 0) {
        throw new HttpError('Customer not found.', 404, 'NOT_FOUND');
      }
      return refreshed.rows[0]!;
    }

    return result.rows[0]!;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const result = await this.db.query(`delete from customers where id = $1`, [customerId]);
    if (result.rowCount === 0) {
      throw new HttpError('Customer not found.', 404, 'NOT_FOUND');
    }
  }

  async createUser(payload: UserMutationInput): Promise<UserRecord> {
    const id = randomUUID();
    const sql = sqlByDialect(this.dialect, {
      postgres: `insert into users (id, email, name, role, full_load_access)
        values ($1, $2, $3, $4, $5)
        returning *`,
      sqlite: `insert into users (id, email, name, role, full_load_access)
        values ($1, $2, $3, $4, $5)`,
    });
    const result = await this.db.query<UserRecord>(sql, [
      id,
      payload.email.toLowerCase(),
      payload.name.trim(),
      payload.role,
      payload.fullLoadAccess ?? false,
    ]);

    if (this.dialect === 'sqlite') {
      const refreshed = await this.getUserById(id);
      if (!refreshed) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }
      return refreshed;
    }

    return result.rows[0]!;
  }

  async updateUser(userId: string, payload: UserMutationInput): Promise<UserRecord> {
    const sql = sqlByDialect(this.dialect, {
      postgres: `update users
        set email = $2, name = $3, role = $4, full_load_access = $5
        where id = $1
        returning *`,
      sqlite: `update users
        set email = $2, name = $3, role = $4, full_load_access = $5
        where id = $1`,
    });
    const result = await this.db.query<UserRecord>(sql, [
      userId,
      payload.email.toLowerCase(),
      payload.name.trim(),
      payload.role,
      payload.fullLoadAccess ?? false,
    ]);

    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404, 'NOT_FOUND');
    }

    if (this.dialect === 'sqlite') {
      const refreshed = await this.getUserById(userId);
      if (!refreshed) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }
      return refreshed;
    }

    return result.rows[0]!;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.db.query(`delete from users where id = $1`, [userId]);
    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404, 'NOT_FOUND');
    }
  }

  async banUser(userId: string): Promise<UserRecord> {
    const sql = sqlByDialect(this.dialect, {
      postgres: `update users
        set role = 'BANNED'
        where id = $1
        returning *`,
      sqlite: `update users
        set role = 'BANNED'
        where id = $1`,
    });
    const result = await this.db.query<UserRecord>(sql, [userId]);

    if (result.rowCount === 0) {
      throw new HttpError('User not found.', 404, 'NOT_FOUND');
    }

    if (this.dialect === 'sqlite') {
      const refreshed = await this.getUserById(userId);
      if (!refreshed) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }
      return refreshed;
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
      throw new HttpError('pickupLocation and destination are required.', 400, 'VALIDATION_ERROR');
    }

    if (!Number.isInteger(payload.remainingCount) || payload.remainingCount < 0) {
      throw new HttpError('remainingCount must be an integer >= 0.', 400, 'VALIDATION_ERROR');
    }

    const id = randomUUID();
    const sql = sqlByDialect(this.dialect, {
      postgres: `insert into greenbush_bank (
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
      sqlite: `insert into greenbush_bank (
          id,
          pickup_location,
          destination,
          receiving_hours,
          price,
          tarp,
          remaining_count,
          special_notes
        ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    });
    const result = await this.db.query<GreenbushRecord>(sql, [
      id,
      payload.pickupLocation.trim(),
      payload.destination.trim(),
      payload.receivingHours?.trim() || null,
      asNumber(payload.price, 'price'),
      payload.tarp?.trim() || null,
      payload.remainingCount,
      payload.specialNotes?.trim() || null,
    ]);

    if (this.dialect === 'sqlite') {
      const refreshed = await this.db.query<GreenbushRecord>(
        `select * from greenbush_bank where id = $1`,
        [id],
      );
      if (refreshed.rowCount === 0) {
        throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
      }
      return refreshed.rows[0]!;
    }

    return result.rows[0]!;
  }

  async updateGreenbush(id: string, payload: GreenbushMutationInput): Promise<GreenbushRecord> {
    const sql = sqlByDialect(this.dialect, {
      postgres: `update greenbush_bank
        set pickup_location = $2,
            destination = $3,
            receiving_hours = $4,
            price = $5,
            tarp = $6,
            remaining_count = $7,
            special_notes = $8
        where id = $1
        returning *`,
      sqlite: `update greenbush_bank
        set pickup_location = $2,
            destination = $3,
            receiving_hours = $4,
            price = $5,
            tarp = $6,
            remaining_count = $7,
            special_notes = $8
        where id = $1`,
    });
    const result = await this.db.query<GreenbushRecord>(sql, [
      id,
      payload.pickupLocation.trim(),
      payload.destination.trim(),
      payload.receivingHours?.trim() || null,
      asNumber(payload.price, 'price'),
      payload.tarp?.trim() || null,
      payload.remainingCount,
      payload.specialNotes?.trim() || null,
    ]);

    if (result.rowCount === 0) {
      throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
    }

    if (this.dialect === 'sqlite') {
      const refreshed = await this.db.query<GreenbushRecord>(
        `select * from greenbush_bank where id = $1`,
        [id],
      );
      if (refreshed.rowCount === 0) {
        throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
      }
      return refreshed.rows[0]!;
    }

    return result.rows[0]!;
  }

  async deleteGreenbush(id: string): Promise<void> {
    const result = await this.db.query(`delete from greenbush_bank where id = $1`, [id]);
    if (result.rowCount === 0) {
      throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
    }
  }

  async incrementGreenbush(greenbushId: string): Promise<GreenbushRecord> {
    const sql = sqlByDialect(this.dialect, {
      postgres: `update greenbush_bank
        set remaining_count = remaining_count + 1
        where id = $1
        returning *`,
      sqlite: `update greenbush_bank
        set remaining_count = remaining_count + 1
        where id = $1`,
    });
    const result = await this.db.query<GreenbushRecord>(sql, [greenbushId]);

    if (result.rowCount === 0) {
      throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
    }

    if (this.dialect === 'sqlite') {
      const refreshed = await this.db.query<GreenbushRecord>(
        `select * from greenbush_bank where id = $1`,
        [greenbushId],
      );
      if (refreshed.rowCount === 0) {
        throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
      }
      return refreshed.rows[0]!;
    }

    return result.rows[0]!;
  }

  async bulkReplaceGreenbush(rows: GreenbushMutationInput[]): Promise<GreenbushRecord[]> {
    if (!rows.length) {
      throw new HttpError('rows must contain at least one Greenbush record.', 400, 'VALIDATION_ERROR');
    }

    return this.db.withTransaction(async (tx) => {
      await tx.query(`delete from greenbush_bank`);

      const inserted: GreenbushRecord[] = [];
      for (const row of rows) {
        if (!row.pickupLocation.trim() || !row.destination.trim()) {
          throw new HttpError('pickupLocation and destination are required.', 400, 'VALIDATION_ERROR');
        }
        if (!Number.isInteger(row.remainingCount) || row.remainingCount < 0) {
          throw new HttpError('remainingCount must be an integer >= 0.', 400, 'VALIDATION_ERROR');
        }

        const id = randomUUID();
        const sql = sqlByDialect(this.dialect, {
          postgres: `insert into greenbush_bank (
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
          sqlite: `insert into greenbush_bank (
              id,
              pickup_location,
              destination,
              receiving_hours,
              price,
              tarp,
              remaining_count,
              special_notes
            ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        });
        const result = await tx.query<GreenbushRecord>(sql, [
          id,
          row.pickupLocation.trim(),
          row.destination.trim(),
          row.receivingHours?.trim() || null,
          asNumber(row.price, 'price'),
          row.tarp?.trim() || null,
          row.remainingCount,
          row.specialNotes?.trim() || null,
        ]);

        if (this.dialect === 'sqlite') {
          const refreshed = await tx.query<GreenbushRecord>(
            `select * from greenbush_bank where id = $1`,
            [id],
          );
          if (refreshed.rowCount === 0) {
            throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
          }
          inserted.push(refreshed.rows[0]!);
        } else {
          inserted.push(result.rows[0]!);
        }
      }

      return inserted;
    });
  }

  async getLoadById(loadId: string): Promise<LoadRecord | null> {
    const result = await this.db.query<LoadRecord>(
      `${this.loadSelectSql}
       where l.id = $1
       limit 1`,
      [loadId],
    );

    return result.rows[0] ?? null;
  }

  async findLatestLoadByRef(loadRefNumber: string): Promise<LoadRecord | null> {
    const trimmed = loadRefNumber.trim();
    if (!trimmed) {
      return null;
    }

    const result = await this.db.query<LoadRecord>(
      `${this.loadSelectSql}
       where l.load_ref_number = $1
       order by l.created_at desc
       limit 1`,
      [trimmed],
    );

    return result.rows[0] ?? null;
  }

  async findLatestLoadByMcleodOrderId(
    mcleodOrderId: string,
    options?: { excludeLoadId?: string; executor?: QueryExecutor },
  ): Promise<LoadRecord | null> {
    const trimmed = mcleodOrderId.trim();
    if (!trimmed) {
      return null;
    }

    const executor = options?.executor ?? this.db;
    const params: unknown[] = [trimmed];
    let excludeClause = '';
    if (options?.excludeLoadId) {
      params.push(options.excludeLoadId);
      excludeClause = `and l.id <> $${params.length}`;
    }

    const result = await executor.query<LoadRecord>(
      `${this.loadSelectSql}
       where l.mcleod_order_id is not null
         and trim(l.mcleod_order_id) <> ''
         and lower(trim(l.mcleod_order_id)) = lower(trim($1))
         ${excludeClause}
       order by l.created_at desc
       limit 1`,
      params,
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
      const idIndex = params.length - 1;
      const nameIndex = params.length;
      clauses.push(`(${idEquals(this.dialect, 'c.id', idIndex)} or ${ciLike(this.dialect, 'c.name', nameIndex)})`);
    }

    if (filters.dispatcher) {
      const dispatcherTerm = filters.dispatcher.trim();
      params.push(dispatcherTerm);
      params.push(`%${dispatcherTerm}%`);
      const idIndex = params.length - 1;
      const nameIndex = params.length;
      clauses.push(`(${idEquals(this.dialect, 'd.id', idIndex)} or ${ciLike(this.dialect, 'd.name', nameIndex)})`);
    }

    if (filters.accountManager) {
      const accountManagerTerm = filters.accountManager.trim();
      params.push(accountManagerTerm);
      params.push(`%${accountManagerTerm}%`);
      const idIndex = params.length - 1;
      const nameIndex = params.length;
      clauses.push(`(${idEquals(this.dialect, 'am.id', idIndex)} or ${ciLike(this.dialect, 'am.name', nameIndex)})`);
    }

    if (filters.from) {
      params.push(filters.from);
      clauses.push(`l.pu_date >= $${params.length}`);
    }

    if (filters.to) {
      params.push(filters.to);
      clauses.push(`l.pu_date <= $${params.length}`);
    }

    if (filters.ref) {
      params.push(filters.ref.trim());
      clauses.push(`l.load_ref_number = $${params.length}`);
    }

    const where = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';

    const result = await this.db.query<LoadRecord>(
      `${this.loadSelectSql}
       ${where}
       order by l.created_at desc`,
      params,
    );

    return result.rows;
  }

  async createLoad(input: CreateLoadInput): Promise<LoadRecord> {
    const rate = asNumber(input.rate, 'rate');
    const miles = asNumber(input.miles, 'miles');
    const loadRefNumber = input.loadRefNumber?.trim() || `AUTO-${Date.now()}`;

    let status: LoadStatus = input.status ?? 'AVAILABLE';
    if (input.status === undefined && status !== 'BROKERAGE' && input.assignedDispatcherId) {
      const dispatcher = await this.getUserById(input.assignedDispatcherId);
      if (!dispatcher || dispatcher.role !== 'DISPATCHER') {
        throw new HttpError('assignedDispatcherId must belong to a dispatcher.', 400, 'VALIDATION_ERROR');
      }
      status = 'COVERED';
    }
    validateMilesForStatus(miles, status);
    const rpm = calculateRpm(rate, miles);

    const mcleodOrderId = input.mcleodOrderId?.trim() || null;
    if (mcleodOrderId) {
      const duplicate = await this.findLatestLoadByMcleodOrderId(mcleodOrderId);
      if (duplicate) {
        throw new HttpError(`McLeod # already exists on Load: ${duplicate.id}`, 409, 'VALIDATION_ERROR');
      }
    }

    let puApptTime = input.puApptTime?.trim() || null;
    let delApptTime = input.delApptTime?.trim() || null;
    const puAppt = input.puAppt ?? false;
    const delAppt = input.delAppt ?? false;

    if (!puAppt) {
      puApptTime = null;
    } else if (!puApptTime) {
      puApptTime = 'Please, Set the APPT';
    }

    if (!delAppt) {
      delApptTime = null;
    } else if (!delApptTime) {
      delApptTime = 'Please, Set the APPT';
    }

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
        notes,
        assigned_dispatcher_id,
        driver_name,
        truck_number,
        reason_log
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )`,
      [
        loadId,
        status,
        input.accountManagerId,
        input.customerId,
        loadRefNumber,
        mcleodOrderId,
        input.puCity.trim(),
        input.puState.trim().toUpperCase(),
        input.puZip?.trim() || null,
        input.puDate || null,
        puApptTime,
        puAppt,
        input.delCity.trim(),
        input.delState.trim().toUpperCase(),
        input.delZip?.trim() || null,
        input.delDate || null,
        delApptTime,
        delAppt,
        rate,
        miles,
        rpm,
        input.notes?.trim() || null,
        input.assignedDispatcherId ?? null,
        input.driverName?.trim() || null,
        input.truckNumber?.trim() || null,
        appendReasonLine(null, `Created by ${input.actorName ?? input.accountManagerId}`),
      ],
    );

    const load = await this.getLoadById(loadId);
    if (!load) {
      throw new HttpError('Load creation failed.', 500, 'INTERNAL_ERROR');
    }

    return load;
  }

  async bookLoad(input: BookInput): Promise<LoadRecord> {
    if (!input.truckNumber.trim() || !input.driverName.trim()) {
      throw new HttpError('Truck number and driver name are required.', 400, 'VALIDATION_ERROR');
    }

    const existing = await this.getLoadById(input.loadId);
    if (!existing) {
      throw new HttpError('Load not found.', 404, 'NOT_FOUND');
    }
    const sql = sqlByDialect(this.dialect, {
      postgres: `update loads
        set status = 'PENDING_APPROVAL',
            assigned_dispatcher_id = $2,
            truck_number = $3,
            driver_name = $4,
            reason_log = $5
        where id = $1
          and status = 'AVAILABLE'
        returning id`,
      sqlite: `update loads
        set status = 'PENDING_APPROVAL',
            assigned_dispatcher_id = $2,
            truck_number = $3,
            driver_name = $4,
            reason_log = $5
        where id = $1
          and status = 'AVAILABLE'`,
    });
    const update = await this.db.query<{ id: string }>(sql, [
      input.loadId,
      input.dispatcherId,
      input.truckNumber.trim(),
      input.driverName.trim(),
      appendReasonLine(existing.reason_log, `Booking request submitted by ${input.actorName}`),
    ]);

    if (update.rowCount === 0) {
      throw new HttpError('Load is no longer available for booking.', 409, 'ALREADY_BOOKED');
    }

    const load = await this.getLoadById(input.loadId);
    if (!load) {
      throw new HttpError('Booked load not found.', 404, 'NOT_FOUND');
    }

    return load;
  }

  async quoteLoad(input: QuoteInput): Promise<LoadRecord> {
    if (!input.pickupDate.trim()) {
      throw new HttpError('pickupDate is required.', 400, 'VALIDATION_ERROR');
    }

    const existing = await this.getLoadById(input.loadId);
    if (!existing) {
      throw new HttpError('Load not found.', 404, 'NOT_FOUND');
    }

    if (existing.status !== 'AVAILABLE') {
      throw new HttpError('Load is no longer available for quote submission.', 409, 'ALREADY_BOOKED');
    }

    if (!existing.customer_quote_accept) {
      throw new HttpError('Quotes are not enabled for this customer.', 409, 'PERMISSION_DENIED');
    }

    const reason = `Quote: Requested Pickup Date Change to ${input.pickupDate.trim()}`;
    const sql = sqlByDialect(this.dialect, {
      postgres: `update loads
        set status = 'QUOTE_SUBMITTED',
            assigned_dispatcher_id = $2,
            requested_pickup_date = $3,
            reason_log = $4
        where id = $1
          and status = 'AVAILABLE'
        returning id`,
      sqlite: `update loads
        set status = 'QUOTE_SUBMITTED',
            assigned_dispatcher_id = $2,
            requested_pickup_date = $3,
            reason_log = $4
        where id = $1
          and status = 'AVAILABLE'`,
    });
    const update = await this.db.query<{ id: string }>(sql, [
      input.loadId,
      input.dispatcherId,
      input.pickupDate.trim(),
      appendReasonLine(existing.reason_log, `${reason} by ${input.actorName}`),
    ]);

    if (update.rowCount === 0) {
      throw new HttpError('Load is no longer available for quote submission.', 409, 'ALREADY_BOOKED');
    }

    const load = await this.getLoadById(input.loadId);
    if (!load) {
      throw new HttpError('Quoted load not found.', 404, 'NOT_FOUND');
    }

    return load;
  }

  async updateLoadStatus(loadId: string, status: LoadStatus, actorName: string, reason?: string): Promise<LoadRecord> {
    const existing = await this.getLoadById(loadId);

    if (!existing) {
      throw new HttpError('Load not found.', 404, 'NOT_FOUND');
    }

    if (['DELAYED', 'CANCELED', 'TONU'].includes(status) && !reason?.trim()) {
      throw new HttpError(`A reason is required when setting status to ${status}.`, 400, 'VALIDATION_ERROR');
    }

    const nextReasonLog = appendReasonLine(
      existing.reason_log,
      `Status -> ${status} by ${actorName}${reason?.trim() ? `: ${reason.trim()}` : ''}`,
    );

    const sql = sqlByDialect(this.dialect, {
      postgres: `update loads
        set status = $2::load_status,
            reason_log = $3,
            delay_reason = case when $2::load_status = 'DELAYED'::load_status then $4 else delay_reason end,
            cancel_reason = case when $2::load_status in ('CANCELED'::load_status, 'TONU'::load_status) then $5 else cancel_reason end
        where id = $1
        returning id`,
      sqlite: `update loads
        set status = $2,
            reason_log = $3,
            delay_reason = case when $2 = 'DELAYED' then $4 else delay_reason end,
            cancel_reason = case when $2 in ('CANCELED', 'TONU') then $5 else cancel_reason end
        where id = $1`,
    });
    const result = await this.db.query<{ id: string }>(sql, [
      loadId,
      status,
      nextReasonLog,
      reason?.trim() || null,
      reason?.trim() || null,
    ]);

    if (result.rowCount === 0) {
      throw new HttpError('Load status update failed.', 500, 'INTERNAL_ERROR');
    }

    const load = await this.getLoadById(loadId);
    if (!load) {
      throw new HttpError('Updated load not found.', 404, 'NOT_FOUND');
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
        customer_name: string | null;
      }>(
        `select
           l.id,
           l.status,
           l.greenbush_bank_id,
           ${dateAsText(this.dialect, 'l.requested_pickup_date', 'requested_pickup_date')},
           l.reason_log,
           c.name as customer_name
         from loads l
         left join customers c on c.id = l.customer_id
         where l.id = $1`,
        [input.loadId],
      );

      if (existing.rowCount === 0) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      const load = existing.rows[0]!;

      if (input.decision === 'accept') {
        if (!['PENDING_APPROVAL', 'QUOTE_SUBMITTED'].includes(load.status)) {
          throw new HttpError('Only pending/quote-submitted loads can be accepted.', 409, 'ALREADY_BOOKED');
        }

        const requestedPickupDate = input.requestedPickupDate?.trim() || load.requested_pickup_date || null;
        const newDeliveryDate = input.newDeliveryDate?.trim() || null;
        const nextMcleodOrderId = input.mcleodOrderId?.trim() || null;

        if (nextMcleodOrderId) {
          const duplicate = await this.findLatestLoadByMcleodOrderId(nextMcleodOrderId, {
            excludeLoadId: input.loadId,
            executor: tx,
          });
          if (duplicate) {
            throw new HttpError(`McLeod # already exists on Load: ${duplicate.id}`, 409, 'VALIDATION_ERROR');
          }
        }

        if (load.status === 'QUOTE_SUBMITTED' && !newDeliveryDate) {
          throw new HttpError('newDeliveryDate is required when accepting a quote-submitted load.', 400, 'VALIDATION_ERROR');
        }

        let reasonLog = load.reason_log;
        if (load.status === 'QUOTE_SUBMITTED') {
          reasonLog = replaceLastQuoteLine(reasonLog, 'Accepted: Quote accepted');
          reasonLog = appendReasonLine(reasonLog, `Accepted by ${input.actorName}`);
        } else {
          reasonLog = appendReasonLine(reasonLog, `Booking approved by ${input.actorName}`);
        }

        const updateSql = sqlByDialect(this.dialect, {
          postgres: `update loads
            set status = 'COVERED'::load_status,
                pu_date = coalesce($3::date, pu_date),
                del_date = coalesce($4::date, del_date),
                load_ref_number = case when $5::text is not null and $5::text <> '' then $5::text else load_ref_number end,
                mcleod_order_id = case when $6::text is not null and $6::text <> '' then $6::text else mcleod_order_id end,
                reason_log = $2
            where id = $1`,
          sqlite: `update loads
            set status = 'COVERED',
                pu_date = coalesce($3, pu_date),
                del_date = coalesce($4, del_date),
                load_ref_number = case when $5 is not null and $5 <> '' then $5 else load_ref_number end,
                mcleod_order_id = case when $6 is not null and $6 <> '' then $6 else mcleod_order_id end,
                reason_log = $2
            where id = $1`,
        });
        await tx.query(updateSql, [
          input.loadId,
          reasonLog,
          requestedPickupDate,
          newDeliveryDate,
          input.loadRefNumber?.trim() || null,
          nextMcleodOrderId,
        ]);

        if (load.greenbush_bank_id && load.customer_name === 'Greenbush') {
          await tx.query(
            `update greenbush_bank
             set remaining_count = ${greatest(this.dialect, 'remaining_count - 1', '0')},
                 reserved_count = ${greatest(this.dialect, 'reserved_count - 1', '0')}
             where id = $1`,
            [load.greenbush_bank_id],
          );
        }
      } else {
        if (!['PENDING_APPROVAL', 'QUOTE_SUBMITTED'].includes(load.status)) {
          throw new HttpError('Only pending/quote-submitted loads can be denied.', 409, 'ALREADY_BOOKED');
        }

        if (load.greenbush_bank_id) {
          await tx.query(
            `update greenbush_bank
             set reserved_count = ${greatest(this.dialect, 'reserved_count - 1', '0')}
             where id = $1`,
            [load.greenbush_bank_id],
          );
        }

        const denyReason = input.denyReason?.trim();
        if (!denyReason) {
          throw new HttpError('denyReason is required when denying a quote or booking.', 400, 'VALIDATION_ERROR');
        }

        const denySql = sqlByDialect(this.dialect, {
          postgres: `update loads
            set status = 'AVAILABLE'::load_status,
                assigned_dispatcher_id = null,
                truck_number = null,
                driver_name = null,
                requested_pickup_date = null,
                deny_quote_reason = $2,
                reason_log = $3
            where id = $1`,
          sqlite: `update loads
            set status = 'AVAILABLE',
                assigned_dispatcher_id = null,
                truck_number = null,
                driver_name = null,
                requested_pickup_date = null,
                deny_quote_reason = $2,
                reason_log = $3
            where id = $1`,
        });
        await tx.query(denySql, [
          input.loadId,
          denyReason,
          appendReasonLine(load.reason_log, `Quote denied by ${input.actorName}: ${denyReason}`),
        ]);
      }

      const refreshed = await tx.query<LoadRecord>(
        `${this.loadSelectSql}
         where l.id = $1
         limit 1`,
        [input.loadId],
      );

      if (refreshed.rowCount === 0) {
        throw new HttpError('Decided load not found.', 404, 'NOT_FOUND');
      }

      return refreshed.rows[0]!;
    });
  }

  async createGreenbushQuote(input: GreenbushQuoteInput): Promise<LoadRecord> {
    return this.db.withTransaction(async (tx) => {
      const updateSql = sqlByDialect(this.dialect, {
        postgres: `update greenbush_bank
          set reserved_count = reserved_count + 1
          where id = $1
            and (remaining_count - reserved_count) > 0
          returning *`,
        sqlite: `update greenbush_bank
          set reserved_count = reserved_count + 1
          where id = $1
            and (remaining_count - reserved_count) > 0`,
      });
      const gb = await tx.query<GreenbushRecord>(updateSql, [input.greenbushId]);

      if (gb.rowCount === 0) {
        const exists = await tx.query<{ id: string }>('select id from greenbush_bank where id = $1', [input.greenbushId]);
        if (exists.rowCount === 0) {
          throw new HttpError('Greenbush record not found.', 404, 'NOT_FOUND');
        }
        throw new HttpError('No remaining Greenbush capacity for this job.', 409, 'GREENBUSH_UNAVAILABLE');
      }

      const greenbush =
        this.dialect === 'sqlite'
          ? (await tx.query<GreenbushRecord>('select * from greenbush_bank where id = $1', [input.greenbushId])).rows[0]!
          : gb.rows[0]!;

      const customerId = await ensureGreenbushCustomer(tx, this.dialect);

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
          pu_appt_time,
          pu_appt,
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
          $1,'QUOTE_SUBMITTED',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
        )`,
        [
          loadId,
          customerId,
          `GB-Q-${Date.now()}`,
          input.pickupDate,
          greenbush.pickup_location,
          'NA',
          input.pickupDate,
          greenbush.receiving_hours || 'Please, Set the APPT',
          true,
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
          appendReasonLine(null, `Greenbush_ID: ${input.greenbushId}`),
        ],
      );

      const refreshed = await tx.query<LoadRecord>(
        `${this.loadSelectSql}
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
    if (updates.puAppt !== undefined) entries.push(['pu_appt', updates.puAppt]);
    if (updates.puAppt === false) {
      entries.push(['pu_appt_time', null]);
    } else if (updates.puApptTime !== undefined) {
      entries.push(['pu_appt_time', updates.puApptTime?.trim() || null]);
    }
    if (updates.delCity !== undefined) entries.push(['del_city', updates.delCity.trim()]);
    if (updates.delState !== undefined) entries.push(['del_state', updates.delState.trim().toUpperCase()]);
    if (updates.delZip !== undefined) entries.push(['del_zip', updates.delZip?.trim() || null]);
    if (updates.delDate !== undefined) entries.push(['del_date', updates.delDate || null]);
    if (updates.delAppt !== undefined) entries.push(['del_appt', updates.delAppt]);
    if (updates.delAppt === false) {
      entries.push(['del_appt_time', null]);
    } else if (updates.delApptTime !== undefined) {
      entries.push(['del_appt_time', updates.delApptTime?.trim() || null]);
    }
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
    const current = await this.getLoadById(loadId);
    if (!current) {
      throw new HttpError('Load not found.', 404, 'NOT_FOUND');
    }

    if (updates.miles !== undefined || updates.status !== undefined) {
      const effectiveStatus = updates.status ?? current.status;
      const effectiveMiles = updates.miles !== undefined ? asNumber(updates.miles, 'miles') : Number(current.miles);
      validateMilesForStatus(effectiveMiles, effectiveStatus);
    }

    if (updates.mcleodOrderId !== undefined) {
      const nextMcleod = updates.mcleodOrderId?.trim() || null;
      const currentMcleod = current.mcleod_order_id?.trim() || null;
      if (nextMcleod && nextMcleod !== currentMcleod) {
        const duplicate = await this.findLatestLoadByMcleodOrderId(nextMcleod, { excludeLoadId: loadId });
        if (duplicate) {
          throw new HttpError(`McLeod # already exists on Load: ${duplicate.id}`, 409, 'VALIDATION_ERROR');
        }
      }
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
      entries.push(['rpm', calculateRpm(rate, miles)]);
    }

    if (entries.length === 0) {
      return current;
    }

    const assignments = entries.map(([column], index) => `${column} = $${index + 2}`);
    const params = [loadId, ...entries.map(([, value]) => value)];

    const updateSql = sqlByDialect(this.dialect, {
      postgres: `update loads set ${assignments.join(', ')} where id = $1 returning id`,
      sqlite: `update loads set ${assignments.join(', ')} where id = $1`,
    });
    const result = await this.db.query<{ id: string }>(updateSql, params);

    if (result.rowCount === 0) {
      throw new HttpError('Load not found.', 404, 'NOT_FOUND');
    }

    const refreshed = await this.getLoadById(loadId);
    if (!refreshed) {
      throw new HttpError('Updated load not found.', 404, 'NOT_FOUND');
    }

    const actorName = updates.actorName?.trim();
    if (actorName) {
      const labels = new Set<string>();
      const changed = (left: unknown, right: unknown): boolean => `${left ?? ''}` !== `${right ?? ''}`;

      if (updates.rate !== undefined && changed(current.rate, refreshed.rate)) labels.add('Rate');
      if (updates.miles !== undefined && changed(current.miles, refreshed.miles)) labels.add('Miles');

      if (
        updates.puCity !== undefined ||
        updates.puState !== undefined ||
        updates.puZip !== undefined ||
        updates.delCity !== undefined ||
        updates.delState !== undefined ||
        updates.delZip !== undefined
      ) {
        if (
          changed(current.pu_city, refreshed.pu_city) ||
          changed(current.pu_state, refreshed.pu_state) ||
          changed(current.pu_zip, refreshed.pu_zip) ||
          changed(current.del_city, refreshed.del_city) ||
          changed(current.del_state, refreshed.del_state) ||
          changed(current.del_zip, refreshed.del_zip)
        ) {
          labels.add('Route');
        }
      }

      if (updates.assignedDispatcherId !== undefined && changed(current.assigned_dispatcher_id, refreshed.assigned_dispatcher_id)) {
        labels.add('Dispatcher');
      }

      if (
        (updates.driverName !== undefined && changed(current.driver_name, refreshed.driver_name)) ||
        (updates.truckNumber !== undefined && changed(current.truck_number, refreshed.truck_number))
      ) {
        labels.add('Driver/Truck');
      }

      if (
        (updates.customerId !== undefined && changed(current.customer_id, refreshed.customer_id)) ||
        (updates.accountManagerId !== undefined && changed(current.account_manager_id, refreshed.account_manager_id))
      ) {
        labels.add('Customer');
      }

      if (
        updates.puDate !== undefined ||
        updates.delDate !== undefined ||
        updates.puAppt !== undefined ||
        updates.puApptTime !== undefined ||
        updates.delAppt !== undefined ||
        updates.delApptTime !== undefined
      ) {
        if (
          changed(current.pu_date, refreshed.pu_date) ||
          changed(current.del_date, refreshed.del_date) ||
          changed(current.pu_appt, refreshed.pu_appt) ||
          changed(current.pu_appt_time, refreshed.pu_appt_time) ||
          changed(current.del_appt, refreshed.del_appt) ||
          changed(current.del_appt_time, refreshed.del_appt_time)
        ) {
          labels.add('Dates');
        }
      }

      if (updates.status !== undefined && changed(current.status, refreshed.status)) {
        labels.add('Status');
      }

      if (labels.size > 0) {
        let reasonLog = refreshed.reason_log;
        for (const label of labels) {
          reasonLog = appendReasonLine(reasonLog, `${label} updated by ${actorName}`);
        }

        await this.db.query(`update loads set reason_log = $2 where id = $1`, [loadId, reasonLog]);
        refreshed.reason_log = reasonLog;
      }
    }

    return refreshed;
  }

  async deleteLoad(loadId: string): Promise<void> {
    // Idempotent delete: deleting an already-removed load is treated as success.
    await this.db.query(`delete from loads where id = $1`, [loadId]);
  }

  async deleteAllLoads(): Promise<number> {
    return this.db.withTransaction(async (tx) => {
      const countResult = await tx.query<{ count: number | string }>(`select count(*) as count from loads`);
      const deletedCount = Number(countResult.rows[0]?.count ?? 0);
      await tx.query(`delete from loads`);
      await tx.query(`update greenbush_bank set reserved_count = 0`);
      return deletedCount;
    });
  }

  async bootstrapDefaults(): Promise<void> {
    await this.db.withTransaction(async (tx) => {
      await ensureGreenbushCustomer(tx, this.dialect);
    });
  }
}
