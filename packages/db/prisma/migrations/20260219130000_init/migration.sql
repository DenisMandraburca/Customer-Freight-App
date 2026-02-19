CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER', 'VIEWER', 'BANNED');
CREATE TYPE load_status AS ENUM ('AVAILABLE', 'PENDING_APPROVAL', 'QUOTE_SUBMITTED', 'COVERED', 'LOADED', 'DELAYED', 'DELIVERED', 'BROKERAGE', 'CANCELED', 'TONU');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'DISPATCHER',
  full_load_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email ~* '^[^@]+@[^@]+$')
);

CREATE TABLE customers (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type in ('Direct Customer', 'Broker')),
  quote_accept boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE greenbush_bank (
  id uuid PRIMARY KEY,
  legacy_id text,
  pickup_location text NOT NULL,
  destination text NOT NULL,
  receiving_hours text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  tarp text,
  remaining_count integer NOT NULL DEFAULT 0 CHECK (remaining_count >= 0),
  reserved_count integer NOT NULL DEFAULT 0,
  special_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE loads (
  id uuid PRIMARY KEY,
  legacy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status load_status NOT NULL DEFAULT 'AVAILABLE',
  account_manager_id uuid REFERENCES users(id),
  customer_id uuid REFERENCES customers(id),
  load_ref_number text NOT NULL,
  mcleod_order_id text,
  requested_pickup_date date,
  pu_city text NOT NULL,
  pu_state text NOT NULL,
  pu_zip text,
  pu_date date,
  pu_appt_time text,
  pu_appt boolean NOT NULL DEFAULT false,
  del_city text NOT NULL,
  del_state text NOT NULL,
  del_zip text,
  del_date date,
  del_appt_time text,
  del_appt boolean NOT NULL DEFAULT false,
  rate numeric(12,2) NOT NULL,
  miles numeric(12,2) NOT NULL,
  rpm numeric(12,2) NOT NULL,
  notes text,
  equipment text,
  assigned_dispatcher_id uuid REFERENCES users(id),
  driver_name text,
  truck_number text,
  reason_log text,
  delay_reason text,
  cancel_reason text,
  deny_quote_reason text,
  other_notes text,
  greenbush_bank_id uuid REFERENCES greenbush_bank(id),
  CHECK (miles > 0),
  CHECK (rate >= 0),
  CHECK (rpm >= 0)
);

CREATE UNIQUE INDEX idx_loads_legacy_id_unique ON loads(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE UNIQUE INDEX idx_greenbush_legacy_id_unique ON greenbush_bank(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_dispatcher ON loads(assigned_dispatcher_id);
CREATE INDEX idx_loads_customer ON loads(customer_id);
CREATE INDEX idx_loads_pu_date ON loads(pu_date);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_greenbush_bank_updated_at
BEFORE UPDATE ON greenbush_bank
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
