-- Campus Food Delivery — core schema
-- See TRD Section 4 (Data model) for the source of truth.

create extension if not exists pgcrypto;

create type payment_status as enum ('pending', 'confirmed', 'rejected');
create type order_status as enum ('unclaimed', 'claimed', 'purchased', 'delivered');

-- Operators and couriers are 1:1 with a Supabase Auth account (auth.users.id).
-- A row here is what grants app-level permissions; auth.users alone grants nothing.
create table operators (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'operator' check (role = 'operator'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table couriers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cafeterias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  cafeteria_id uuid not null references cafeterias (id) on delete cascade,
  name text not null,
  price_per_spoon numeric(10, 2) not null check (price_per_spoon > 0),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_cafeteria_id_idx on menu_items (cafeteria_id);

-- Fixed list of ten campus locations (PRD 4.4). Editable only through the CMS,
-- never free text, per the "closed dropdown list" rule.
create table delivery_destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per (cafeteria, destination) pair. Absence of a row means that
-- destination is not servable from that cafeteria (TRD 5.2) — never default to 0.
create table delivery_fees (
  id uuid primary key default gen_random_uuid(),
  cafeteria_id uuid not null references cafeterias (id) on delete cascade,
  destination_id uuid not null references delivery_destinations (id) on delete cascade,
  fee numeric(10, 2) not null check (fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafeteria_id, destination_id)
);

create index delivery_fees_cafeteria_id_idx on delivery_fees (cafeteria_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_contact text not null,
  cafeteria_id uuid not null references cafeterias (id),
  destination_id uuid not null references delivery_destinations (id),
  food_total numeric(10, 2) not null check (food_total >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  grand_total numeric(10, 2) not null check (grand_total >= 0),
  payment_proof_url text,
  payment_status payment_status not null default 'pending',
  status order_status not null default 'unclaimed',
  substitution_used boolean not null default false,
  substitution_note text,
  courier_id uuid references couriers (id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references operators (id),
  rejected_at timestamptz,
  rejected_by uuid references operators (id),
  purchased_at timestamptz,
  delivered_at timestamptz
);

create index orders_pool_idx on orders (status, payment_status);
create index orders_courier_id_idx on orders (courier_id);
create index orders_cafeteria_id_idx on orders (cafeteria_id);

-- Every order has two full sets of lines (is_backup = false / true), TRD 4.
create table order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id),
  spoon_count integer not null check (spoon_count > 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  is_backup boolean not null default false
);

create index order_lines_order_id_idx on order_lines (order_id);

-- Funding/purchase/delivery timeline, kept separate from orders.status so the
-- dispatch board can show timestamps without overloading the status enum.
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders (id) on delete cascade,
  courier_id uuid not null references couriers (id),
  claimed_at timestamptz not null default now(),
  funded_at timestamptz,
  funded_by uuid references operators (id),
  purchased_at timestamptz,
  delivered_at timestamptz
);

-- Audit trail (TRD 7 NFR): every payment confirmation, funding record, and CMS
-- edit is timestamped and attributed, even with a single operator today.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id);
