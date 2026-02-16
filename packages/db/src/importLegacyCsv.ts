import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import dotenv from 'dotenv';

import { closeDb, getDb, type QueryExecutor } from './client.js';
import { runMigrations } from './migrations.js';

type ImportCounters = {
  inserted: number;
  updated: number;
  rejected: number;
};

type ImportReport = {
  started_at: string;
  finished_at?: string;
  input_dir: string;
  users: ImportCounters;
  customers: ImportCounters;
  greenbush: ImportCounters;
  loads: ImportCounters;
  errors: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(workspaceRoot, '.env') });

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]!;
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(value.trim());
      value = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }

      if (value.length > 0 || row.length > 0) {
        row.push(value.trim());
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    rows.push(row);
  }

  return rows;
}

function toObject(row: string[], headers: string[]): Record<string, string> {
  const value: Record<string, string> = {};
  headers.forEach((header, index) => {
    value[header] = row[index] ?? '';
  });
  return value;
}

function normalizeRole(roleRaw: string): 'ADMIN' | 'MANAGER' | 'ACCOUNT_MANAGER' | 'DISPATCHER' | 'VIEWER' | 'BANNED' {
  const role = roleRaw.trim().toUpperCase().replace(/\s+/g, '_');
  if (role === 'ACCOUNT_MANAGER') return 'ACCOUNT_MANAGER';
  if (role === 'ACCOUNT') return 'ACCOUNT_MANAGER';
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'MANAGER') return 'MANAGER';
  if (role === 'DISPATCHER') return 'DISPATCHER';
  if (role === 'BANNED') return 'BANNED';
  return 'VIEWER';
}

function normalizeStatus(statusRaw: string):
  | 'AVAILABLE'
  | 'PENDING_APPROVAL'
  | 'QUOTE_SUBMITTED'
  | 'COVERED'
  | 'LOADED'
  | 'DELAYED'
  | 'DELIVERED'
  | 'BROKERAGE'
  | 'CANCELED'
  | 'TONU' {
  const status = statusRaw.trim().toUpperCase().replace(/\s+/g, '_');
  if (status === 'PENDING') return 'PENDING_APPROVAL';
  if (status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (status === 'QUOTE_SUBMITTED') return 'QUOTE_SUBMITTED';
  if (status === 'COVERED') return 'COVERED';
  if (status === 'LOADED') return 'LOADED';
  if (status === 'DELAYED') return 'DELAYED';
  if (status === 'DELIVERED') return 'DELIVERED';
  if (status === 'BROKERAGE') return 'BROKERAGE';
  if (status === 'CANCELED') return 'CANCELED';
  if (status === 'TONU') return 'TONU';
  return 'AVAILABLE';
}

function normalizeCustomerType(typeRaw: string): 'Direct Customer' | 'Broker' {
  return typeRaw.trim().toLowerCase() === 'broker' ? 'Broker' : 'Direct Customer';
}

function toBoolean(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'y';
}

function toNumber(raw: string, fallback = 0): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40);
}

async function readCsvObjects(filePath: string): Promise<Record<string, string>[]> {
  const content = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(content);
  if (!rows.length) {
    return [];
  }

  const headers = rows[0]!.map((header) => header.trim());
  return rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== '')).map((row) => toObject(row, headers));
}

async function ensureUserByName(
  tx: QueryExecutor,
  nameRaw: string,
  role: 'ACCOUNT_MANAGER' | 'DISPATCHER',
  emailByName: Map<string, string>,
  userIdByEmail: Map<string, string>,
): Promise<string | null> {
  const name = nameRaw.trim();
  if (!name) {
    return null;
  }

  const lookup = name.toLowerCase();
  const existingEmail = emailByName.get(lookup);
  if (existingEmail) {
    return userIdByEmail.get(existingEmail) ?? null;
  }

  let email = `${slugify(name) || 'import.user'}@afctransport.com`;
  let suffix = 1;
  while (userIdByEmail.has(email)) {
    suffix += 1;
    email = `${slugify(name) || 'import.user'}${suffix}@afctransport.com`;
  }

  const id = randomUUID();
  await tx.query(
    `insert into users (id, email, name, role)
     values ($1, $2, $3, $4)`,
    [id, email, name, role],
  );
  emailByName.set(lookup, email);
  userIdByEmail.set(email, id);
  return id;
}

async function importLegacyData(inputDir: string): Promise<ImportReport> {
  const report: ImportReport = {
    started_at: new Date().toISOString(),
    input_dir: inputDir,
    users: { inserted: 0, updated: 0, rejected: 0 },
    customers: { inserted: 0, updated: 0, rejected: 0 },
    greenbush: { inserted: 0, updated: 0, rejected: 0 },
    loads: { inserted: 0, updated: 0, rejected: 0 },
    errors: [],
  };

  const db = await getDb();
  await runMigrations(db);

  const usersFile = path.join(inputDir, 'System_Users.csv');
  const customersFile = path.join(inputDir, 'Customers.csv');
  const greenbushFile = path.join(inputDir, 'Greenbush_Loads.csv');
  const loadsFile = path.join(inputDir, 'Loads.csv');

  const [usersRows, customersRows, greenbushRows, loadsRows] = await Promise.all([
    readCsvObjects(usersFile),
    readCsvObjects(customersFile),
    readCsvObjects(greenbushFile),
    readCsvObjects(loadsFile),
  ]);

  const userIdByEmail = new Map<string, string>();
  const emailByName = new Map<string, string>();
  const customerIdByName = new Map<string, string>();
  const greenbushIdByLegacy = new Map<string, string>();

  await db.withTransaction(async (tx) => {
    for (const row of usersRows) {
      try {
        const name = (row.Name || '').trim();
        if (!name) {
          report.users.rejected += 1;
          report.errors.push('Skipped user row with empty Name.');
          continue;
        }

        let email = (row.Email || '').trim().toLowerCase();
        if (!email) {
          const base = slugify(name) || 'legacy.user';
          email = `${base}@afctransport.com`;
        }

        const role = normalizeRole(row.Role || '');
        const existing = await tx.query<{ id: string }>(`select id from users where lower(email) = lower($1)`, [email]);
        if (existing.rowCount > 0) {
          await tx.query(
            `update users
             set name = $2, role = $3
             where id = $1`,
            [existing.rows[0]!.id, name, role],
          );
          report.users.updated += 1;
          userIdByEmail.set(email, existing.rows[0]!.id);
          emailByName.set(name.toLowerCase(), email);
          continue;
        }

        const id = randomUUID();
        await tx.query(
          `insert into users (id, email, name, role)
           values ($1, $2, $3, $4)`,
          [id, email, name, role],
        );
        report.users.inserted += 1;
        userIdByEmail.set(email, id);
        emailByName.set(name.toLowerCase(), email);
      } catch (error) {
        report.users.rejected += 1;
        report.errors.push(`User import error: ${String(error)}`);
      }
    }

    for (const row of customersRows) {
      try {
        const name = (row.Customer_Name || row.name || '').trim();
        if (!name) {
          report.customers.rejected += 1;
          report.errors.push('Skipped customer row with empty Customer_Name.');
          continue;
        }
        const type = normalizeCustomerType(row.Type || row.type || '');
        const quoteAccept = toBoolean(row.Quote_Accept || row.quote_accept || '');

        const existing = await tx.query<{ id: string }>(`select id from customers where lower(name) = lower($1)`, [name]);
        if (existing.rowCount > 0) {
          await tx.query(
            `update customers
             set type = $2, quote_accept = $3
             where id = $1`,
            [existing.rows[0]!.id, type, quoteAccept],
          );
          report.customers.updated += 1;
          customerIdByName.set(name.toLowerCase(), existing.rows[0]!.id);
          continue;
        }

        const id = randomUUID();
        await tx.query(
          `insert into customers (id, name, type, quote_accept)
           values ($1, $2, $3, $4)`,
          [id, name, type, quoteAccept],
        );
        report.customers.inserted += 1;
        customerIdByName.set(name.toLowerCase(), id);
      } catch (error) {
        report.customers.rejected += 1;
        report.errors.push(`Customer import error: ${String(error)}`);
      }
    }

    for (const row of greenbushRows) {
      try {
        const legacyId = (row.ID || '').trim() || null;
        const pickupLocation = (row.Pickup_Location || '').trim();
        const destination = (row.Destination || '').trim();
        if (!pickupLocation || !destination) {
          report.greenbush.rejected += 1;
          report.errors.push(`Skipped Greenbush row ${legacyId ?? '(no id)'} with missing pickup/destination.`);
          continue;
        }

        const payload = {
          pickupLocation,
          destination,
          receivingHours: (row.Receiving_Hours || '').trim() || null,
          price: toNumber(row.Price || '0', 0),
          tarp: (row.Tarp || '').trim() || null,
          remainingCount: Math.max(0, Math.trunc(toNumber(row.Amount || '0', 0))),
          specialNotes: (row.Special_Notes || '').trim() || null,
        };

        const existing = legacyId
          ? await tx.query<{ id: string }>(`select id from greenbush_bank where legacy_id = $1`, [legacyId])
          : await tx.query<{ id: string }>(
              `select id
               from greenbush_bank
               where lower(pickup_location) = lower($1)
                 and lower(destination) = lower($2)
               limit 1`,
              [payload.pickupLocation, payload.destination],
            );

        if (existing.rowCount > 0) {
          await tx.query(
            `update greenbush_bank
             set pickup_location = $2,
                 destination = $3,
                 receiving_hours = $4,
                 price = $5,
                 tarp = $6,
                 remaining_count = $7,
                 special_notes = $8,
                 legacy_id = $9
             where id = $1`,
            [
              existing.rows[0]!.id,
              payload.pickupLocation,
              payload.destination,
              payload.receivingHours,
              payload.price,
              payload.tarp,
              payload.remainingCount,
              payload.specialNotes,
              legacyId,
            ],
          );
          report.greenbush.updated += 1;
          if (legacyId) {
            greenbushIdByLegacy.set(legacyId, existing.rows[0]!.id);
          }
          continue;
        }

        const id = randomUUID();
        await tx.query(
          `insert into greenbush_bank (
             id,
             legacy_id,
             pickup_location,
             destination,
             receiving_hours,
             price,
             tarp,
             remaining_count,
             special_notes
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            id,
            legacyId,
            payload.pickupLocation,
            payload.destination,
            payload.receivingHours,
            payload.price,
            payload.tarp,
            payload.remainingCount,
            payload.specialNotes,
          ],
        );
        report.greenbush.inserted += 1;
        if (legacyId) {
          greenbushIdByLegacy.set(legacyId, id);
        }
      } catch (error) {
        report.greenbush.rejected += 1;
        report.errors.push(`Greenbush import error: ${String(error)}`);
      }
    }

    for (const row of loadsRows) {
      try {
        const legacyId = (row.ID || '').trim() || null;
        const customerName = (row.Customer_Name || '').trim();
        const customerKey = customerName.toLowerCase();
        let customerId = customerIdByName.get(customerKey) ?? null;

        if (!customerId && customerName) {
          const insertedCustomerId = randomUUID();
          await tx.query(
            `insert into customers (id, name, type, quote_accept)
             values ($1, $2, $3, $4)
             on conflict (name) do nothing`,
            [insertedCustomerId, customerName, normalizeCustomerType(row.Customer_Type || ''), false],
          );
          const lookedUp = await tx.query<{ id: string }>(`select id from customers where lower(name) = lower($1)`, [customerName]);
          customerId = lookedUp.rows[0]?.id ?? null;
          if (customerId) {
            customerIdByName.set(customerKey, customerId);
          }
        }

        const accountManagerId = await ensureUserByName(
          tx,
          row.SA_Name || '',
          'ACCOUNT_MANAGER',
          emailByName,
          userIdByEmail,
        );
        const dispatcherId = await ensureUserByName(
          tx,
          row.Assigned_Dispatcher || '',
          'DISPATCHER',
          emailByName,
          userIdByEmail,
        );

        const status = normalizeStatus(row.Status || '');
        const rate = toNumber(row.Rate || '0', 0);
        let miles = toNumber(row.Miles || '0', 0);
        if (miles <= 0) {
          miles = 1;
        }
        const rpm = toNumber(row.RPM || '', rate / miles);
        const requestedPickupDate = normalizeDate(row.PU_Date || '');

        const greenbushLegacy = (() => {
          const reasonLog = (row.Reason_Log || '').trim();
          const match = reasonLog.match(/Greenbush_Load_ID:\s*([^\s]+)/i);
          return match?.[1]?.trim() ?? null;
        })();
        const greenbushBankId = greenbushLegacy ? (greenbushIdByLegacy.get(greenbushLegacy) ?? null) : null;

        const loadRefNumber = (row.Load_Ref_Number || '').trim() || legacyId || `LEGACY-${Date.now()}`;

        const payload = {
          legacyId,
          status,
          accountManagerId,
          customerId,
          loadRefNumber,
          mcleodOrderId: (row.McLeod_Order_ID || '').trim() || null,
          requestedPickupDate,
          puCity: (row.PU_City || '').trim() || 'Unknown',
          puState: (row.PU_State || '').trim().toUpperCase() || 'NA',
          puZip: (row.PU_Zip || '').trim() || null,
          puDate: normalizeDate(row.PU_Date || ''),
          puApptTime: (row.PU_Appt_Time || '').trim() || null,
          puAppt: toBoolean(row.PU_APPT || ''),
          delCity: (row.Del_City || '').trim() || 'Unknown',
          delState: (row.Del_State || '').trim().toUpperCase() || 'NA',
          delZip: (row.Del_Zip || '').trim() || null,
          delDate: normalizeDate(row.Del_Date || ''),
          delApptTime: (row.Del_Appt_Time || '').trim() || null,
          delAppt: toBoolean(row.Del_APPT || ''),
          rate,
          miles,
          rpm,
          notes: (row.Notes || '').trim() || null,
          equipment: (row.Equipment || '').trim() || null,
          assignedDispatcherId: dispatcherId,
          driverName: (row.Driver_Name || '').trim() || null,
          truckNumber: (row.Truck_Number || '').trim() || null,
          reasonLog: (row.Reason_Log || '').trim() || null,
          delayReason: (row.Delay_Reson || '').trim() || (row.Delay_Reason || '').trim() || null,
          cancelReason: (row.Cancel_Reason || '').trim() || null,
          denyQuoteReason: (row.Deny_Quote_Reason || '').trim() || null,
          otherNotes: (row.Other_Notes || '').trim() || null,
          greenbushBankId,
          createdAt: normalizeDate(row.Created_Timestamp || ''),
        };

        const existing = legacyId
          ? await tx.query<{ id: string }>(`select id from loads where legacy_id = $1`, [legacyId])
          : await tx.query<{ id: string }>(`select id from loads where load_ref_number = $1 order by created_at desc limit 1`, [
              payload.loadRefNumber,
            ]);

        if (existing.rowCount > 0) {
          await tx.query(
            `update loads
             set status = $2,
                 account_manager_id = $3,
                 customer_id = $4,
                 load_ref_number = $5,
                 mcleod_order_id = $6,
                 requested_pickup_date = $7,
                 pu_city = $8,
                 pu_state = $9,
                 pu_zip = $10,
                 pu_date = $11,
                 pu_appt_time = $12,
                 pu_appt = $13,
                 del_city = $14,
                 del_state = $15,
                 del_zip = $16,
                 del_date = $17,
                 del_appt_time = $18,
                 del_appt = $19,
                 rate = $20,
                 miles = $21,
                 rpm = $22,
                 notes = $23,
                 equipment = $24,
                 assigned_dispatcher_id = $25,
                 driver_name = $26,
                 truck_number = $27,
                 reason_log = $28,
                 delay_reason = $29,
                 cancel_reason = $30,
                 deny_quote_reason = $31,
                 other_notes = $32,
                 greenbush_bank_id = $33,
                 legacy_id = $34
             where id = $1`,
            [
              existing.rows[0]!.id,
              payload.status,
              payload.accountManagerId,
              payload.customerId,
              payload.loadRefNumber,
              payload.mcleodOrderId,
              payload.requestedPickupDate,
              payload.puCity,
              payload.puState,
              payload.puZip,
              payload.puDate,
              payload.puApptTime,
              payload.puAppt,
              payload.delCity,
              payload.delState,
              payload.delZip,
              payload.delDate,
              payload.delApptTime,
              payload.delAppt,
              payload.rate,
              payload.miles,
              payload.rpm,
              payload.notes,
              payload.equipment,
              payload.assignedDispatcherId,
              payload.driverName,
              payload.truckNumber,
              payload.reasonLog,
              payload.delayReason,
              payload.cancelReason,
              payload.denyQuoteReason,
              payload.otherNotes,
              payload.greenbushBankId,
              payload.legacyId,
            ],
          );
          report.loads.updated += 1;
          continue;
        }

        await tx.query(
          `insert into loads (
             id,
             created_at,
             legacy_id,
             status,
             account_manager_id,
             customer_id,
             load_ref_number,
             mcleod_order_id,
             requested_pickup_date,
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
             equipment,
             assigned_dispatcher_id,
             driver_name,
             truck_number,
             reason_log,
             delay_reason,
             cancel_reason,
             deny_quote_reason,
             other_notes,
             greenbush_bank_id
           ) values (
             $1,coalesce($2::timestamptz, now()),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
           )`,
          [
            randomUUID(),
            payload.createdAt,
            payload.legacyId,
            payload.status,
            payload.accountManagerId,
            payload.customerId,
            payload.loadRefNumber,
            payload.mcleodOrderId,
            payload.requestedPickupDate,
            payload.puCity,
            payload.puState,
            payload.puZip,
            payload.puDate,
            payload.puApptTime,
            payload.puAppt,
            payload.delCity,
            payload.delState,
            payload.delZip,
            payload.delDate,
            payload.delApptTime,
            payload.delAppt,
            payload.rate,
            payload.miles,
            payload.rpm,
            payload.notes,
            payload.equipment,
            payload.assignedDispatcherId,
            payload.driverName,
            payload.truckNumber,
            payload.reasonLog,
            payload.delayReason,
            payload.cancelReason,
            payload.denyQuoteReason,
            payload.otherNotes,
            payload.greenbushBankId,
          ],
        );
        report.loads.inserted += 1;
      } catch (error) {
        report.loads.rejected += 1;
        report.errors.push(`Load import error: ${String(error)}`);
      }
    }
  });

  report.finished_at = new Date().toISOString();
  return report;
}

async function main(): Promise<void> {
  const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(workspaceRoot, 'legacy-export');
  const report = await importLegacyData(inputDir);
  const reportPath = path.join(inputDir, 'import-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Legacy import completed. Report written to ${reportPath}`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Legacy import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
