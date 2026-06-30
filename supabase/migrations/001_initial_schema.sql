-- =====================================================================
-- METAFORGE ENGINEERING (I) PVT. LTD.
-- Raw Material Inventory & FIFO Management System  (Khatwad plant)
-- Migration 001 — initial schema
--
-- Contents:
--   1. Extensions
--   2. Helper functions (updated_at, is_admin)
--   3. Tables (10) + indexes + constraints
--   4. FIFO query-time view (v_fifo_queue)
--   5. Auth -> public.users sync trigger
--   6. Row Level Security policies
--
-- Design note on foreign keys:
--   Google Sheets is the source of truth and is hand-edited by operators.
--   Hard FKs on SYNCED columns (e.g. grn_entries.rm_code) would let a single
--   typo in the sheet reject an entire sync row, silently dropping inventory.
--   So synced cross-references are kept as INDEXED soft references (no FK),
--   and hard FKs are used only for APP-MANAGED integrity that the sheet can't
--   violate (assigned_by -> users, audit_logs.user_id -> users) and for
--   fifo_lots.coil_number -> grn_entries (fifo_lots is derived from GRN by the
--   app, never by the sheet, so the parent always exists first).
--   The "Held" scenario (a coil racked before its GRN row arrives) is exactly
--   why coil_locations.coil_number must NOT hard-FK to grn_entries.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------

-- Generic updated_at stamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role check used throughout RLS. SECURITY DEFINER so it can read
-- public.users without tripping that table's own RLS (avoids recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
      and u.is_active = true
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------

-- 3.1 users  (mirrors auth.users; id == auth user id)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  role        text not null default 'viewer' check (role in ('admin','viewer')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 3.2 rm_master  (app-managed canonical material list)
create table public.rm_master (
  id            uuid primary key default gen_random_uuid(),
  rm_code       text unique not null,
  description   text,
  plant         text default 'Khatwad',
  lead_time     int,
  safety_factor numeric,
  max_level     numeric,
  status        text not null default 'active' check (status in ('active','inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3.3 grn_entries  (synced from GRN tab; one row per received coil)
create table public.grn_entries (
  id            uuid primary key default gen_random_uuid(),
  coil_number   text unique not null,          -- PRIMARY MATCHING KEY
  rm_code       text,                          -- soft ref -> rm_master.rm_code
  heat_number   text,
  weight        numeric,                        -- kg
  supplier      text,
  received_date date not null,                  -- drives FIFO order (from coil-date tail)
  plant         text default 'Khatwad',
  source        text not null default 'GRN' check (source in ('GRN','transfer')),
  synced_at     timestamptz not null default now()
);

-- 3.4 location_master  (app-managed catalogue of valid rack locations)
create table public.location_master (
  id            uuid primary key default gen_random_uuid(),
  location_code text unique not null
                 check (location_code ~ '^R[0-9]+-B[0-9]+-L[0-9]+$'),  -- R{n}-B{n}-L{n}
  rack          text,
  bay           text,
  row_no        text,                           -- "row" is a reserved word
  level_no      text,                           -- "level" is a reserved word
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3.5 coil_locations  (synced from Racked (248); coil <-> physical location)
-- NOTE: coil_number is NOT FK'd to grn_entries on purpose (the "Held" case).
create table public.coil_locations (
  id            uuid primary key default gen_random_uuid(),
  coil_number   text unique not null,           -- soft ref -> grn_entries.coil_number
  rm_code       text,
  rack          text,
  bay           text,
  row_no        text,
  level_no      text,
  location_code text unique,                     -- e.g. R2-B4-L1
  assigned_at   timestamptz not null default now(),
  assigned_by   uuid references public.users(id) -- app-managed -> hard FK ok
);

-- 3.6 fifo_lots  (app-derived from grn_entries; the heart of the FIFO board)
-- fifo_sequence is intentionally NOT a column: it is computed at query time
-- via ROW_NUMBER() in v_fifo_queue. age in days is likewise never stored.
create table public.fifo_lots (
  id               uuid primary key default gen_random_uuid(),
  coil_number      text unique not null
                     references public.grn_entries(coil_number) on delete cascade,
  rm_code          text,                          -- soft ref -> rm_master.rm_code
  weight_available numeric,                        -- carried from GRN weight
  status           text not null default 'pending_location'
                     check (status in ('available','issued','pending_location')),
  location_code    text,                           -- soft ref -> filled by merge; null = pending
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3.7 issue_transactions  (synced from ISSUE_TO_M/C; display only)
create table public.issue_transactions (
  id          uuid primary key default gen_random_uuid(),
  coil_number text,                               -- soft ref -> grn_entries.coil_number
  rm_code     text,
  machine     text,
  issued_qty  numeric,                            -- kg
  issue_date  date,
  shift       text,
  operator    text,
  synced_at   timestamptz not null default now(),
  -- composite key used by the sync upsert to prevent duplicate issue rows
  unique (coil_number, issue_date, machine, shift)
);

-- 3.8 dashboard_data  (synced from DASHBOARD; mirror exactly, no calculation)
create table public.dashboard_data (
  id               uuid primary key default gen_random_uuid(),
  rm_code          text unique not null,          -- upsert key; always overwrite
  description      text,
  plant            text default 'Khatwad',
  physical_stock   numeric,                        -- MOST IMPORTANT field
  peak_avg_daily   numeric,
  avg_daily        numeric,
  off_avg_daily    numeric,
  lead_time        int,
  safety_factor    numeric,
  max_level        numeric,
  opening_stock    numeric,                        -- the "10-June" column (header is a date)
  inward           numeric,
  outward          numeric,
  khatwad_received numeric,                        -- "Khatwad Received From Metaforge"
  khatwad_sent     numeric,                        -- "Khatwad Send To Metaforge"
  synced_at        timestamptz not null default now()
);

-- 3.9 sync_logs  (one row per tab per sync run; Edge Function writes only)
create table public.sync_logs (
  id            uuid primary key default gen_random_uuid(),
  sheet_tab     text,                             -- DASHBOARD | GRN | ISSUE_TO_M/C | Racked (248)
  trigger       text check (trigger in ('scheduled','manual')),
  status        text check (status in ('success','partial','failed')),
  rows_synced   int default 0,
  rows_skipped  int default 0,                    -- duplicates / orphans
  error_message text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

-- 3.10 audit_logs  (every admin mutation; Edge Function writes only)
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id),
  action      text check (action in ('INSERT','UPDATE','DELETE','ASSIGN_LOCATION')),
  table_name  text,
  record_id   text,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes (soft references + common filters/sorts)
-- ---------------------------------------------------------------------
create index idx_grn_rm_code        on public.grn_entries (rm_code);
create index idx_grn_received_date  on public.grn_entries (received_date);
create index idx_grn_supplier       on public.grn_entries (supplier);

create index idx_fifo_rm_code       on public.fifo_lots (rm_code);
create index idx_fifo_status        on public.fifo_lots (status);
create index idx_fifo_location      on public.fifo_lots (location_code);

create index idx_coilloc_loccode    on public.coil_locations (location_code);
create index idx_coilloc_rm         on public.coil_locations (rm_code);

create index idx_issue_rm_code      on public.issue_transactions (rm_code);
create index idx_issue_coil         on public.issue_transactions (coil_number);
create index idx_issue_machine      on public.issue_transactions (machine);
create index idx_issue_date         on public.issue_transactions (issue_date);

create index idx_dash_rm_code       on public.dashboard_data (rm_code);

create index idx_sync_tab_started   on public.sync_logs (sheet_tab, started_at desc);
create index idx_audit_user         on public.audit_logs (user_id);
create index idx_audit_table        on public.audit_logs (table_name, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers (app-managed tables only)
-- ---------------------------------------------------------------------
create trigger trg_rm_master_updated
  before update on public.rm_master
  for each row execute function public.set_updated_at();

create trigger trg_location_master_updated
  before update on public.location_master
  for each row execute function public.set_updated_at();

create trigger trg_fifo_lots_updated
  before update on public.fifo_lots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. FIFO query-time view
--    Sequence + age are computed here, never stored. The board and table
--    views both read from this. received_date / heat / supplier come from
--    grn_entries; location_code is resolved to its rack for the pill.
-- ---------------------------------------------------------------------
create or replace view public.v_fifo_queue as
select
  f.id,
  f.coil_number,
  f.rm_code,
  g.heat_number,
  g.received_date,
  (current_date - g.received_date)                       as age_days,
  f.weight_available,
  g.source,
  f.status,
  f.location_code,
  cl.rack,
  cl.bay,
  cl.row_no,
  cl.level_no,
  (f.location_code is not null)                          as has_location,
  row_number() over (
    partition by f.rm_code
    order by g.received_date asc, f.coil_number asc
  )                                                       as fifo_sequence
from public.fifo_lots f
join public.grn_entries g       on g.coil_number = f.coil_number
left join public.coil_locations cl on cl.coil_number = f.coil_number;

-- ---------------------------------------------------------------------
-- 5. Auth -> public.users sync
--    Every new Supabase Auth user gets a public.users row, default viewer.
--    Promote to admin manually (see seed.sql) or via the Admin Panel.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
alter table public.users               enable row level security;
alter table public.rm_master           enable row level security;
alter table public.grn_entries         enable row level security;
alter table public.location_master     enable row level security;
alter table public.coil_locations      enable row level security;
alter table public.fifo_lots           enable row level security;
alter table public.issue_transactions  enable row level security;
alter table public.dashboard_data      enable row level security;
alter table public.sync_logs           enable row level security;
alter table public.audit_logs          enable row level security;

-- users: a user can read its own row; admins manage everyone.
create policy users_select_self on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy users_admin_write on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Data tables: all authenticated users SELECT; only admins write.
-- (service_role bypasses RLS entirely, so the sync/write-back Edge
--  Functions are unaffected by these policies.)
do $$
declare t text;
begin
  foreach t in array array[
    'rm_master','grn_entries','location_master','coil_locations',
    'fifo_lots','issue_transactions','dashboard_data'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true);',
      t || '_select_all', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin());',
      t || '_admin_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin());',
      t || '_admin_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin());',
      t || '_admin_delete', t);
  end loop;
end $$;

-- sync_logs / audit_logs: authenticated may READ; INSERT is service_role only
-- (no insert policy for authenticated => blocked; service_role bypasses RLS).
create policy sync_logs_select  on public.sync_logs  for select to authenticated using (true);
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime: FIFO board subscribes to fifo_lots + coil_locations
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.fifo_lots;
alter publication supabase_realtime add table public.coil_locations;
alter publication supabase_realtime add table public.sync_logs;
