-- =====================================================================
-- Migration 002 — sync support: FIFO merge function + hourly schedule
--
-- The Sheets read happens in the `sync-sheets` Edge Function (it needs
-- HTTP + Google OAuth, which only the Deno runtime can do). After the
-- function upserts the 4 tabs, it calls run_fifo_merge() to rebuild the
-- FIFO board from grn_entries + coil_locations. pg_cron fires the function
-- hourly via pg_net.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FIFO merge — pure relational, idempotent. Safe to run after every sync.
--   1. Create a fifo_lot for any GRN coil that doesn't have one (the
--      "Location Pending" / "Rack Assigned" states).
--   2. Refresh location_code + status on existing lots (handles the
--      "Held" case: a coil racked before its GRN row finally gets a lot).
--   3. Report orphan count (racked coils with no GRN — not shown on board).
-- No inventory math: weight_available is carried straight from GRN weight.
-- ---------------------------------------------------------------------
create or replace function public.run_fifo_merge()
returns table (inserted int, relocated int, orphaned int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted  int := 0;
  v_relocated int := 0;
  v_orphaned  int := 0;
begin
  -- 1. New lots for GRN coils not yet on the board
  with ins as (
    insert into fifo_lots (coil_number, rm_code, weight_available, status, location_code)
    select
      g.coil_number,
      g.rm_code,
      g.weight,
      case when cl.location_code is not null then 'available' else 'pending_location' end,
      cl.location_code
    from grn_entries g
    left join coil_locations cl on cl.coil_number = g.coil_number
    where not exists (select 1 from fifo_lots f where f.coil_number = g.coil_number)
    returning 1
  )
  select count(*) into v_inserted from ins;

  -- 2. Location may have arrived after the GRN row — refresh it
  with upd as (
    update fifo_lots f
    set
      location_code = cl.location_code,
      status = case when cl.location_code is not null then 'available' else 'pending_location' end
    from coil_locations cl
    where cl.coil_number = f.coil_number
      and f.location_code is distinct from cl.location_code
    returning 1
  )
  select count(*) into v_relocated from upd;

  -- 3. Orphans: racked but never received (logged by the sync function)
  select count(*) into v_orphaned
  from coil_locations cl
  where not exists (select 1 from grn_entries g where g.coil_number = cl.coil_number);

  return query select v_inserted, v_relocated, v_orphaned;
end;
$$;

-- ---------------------------------------------------------------------
-- Hourly schedule (pg_cron + pg_net).
-- Enable the extensions, then schedule a POST to the Edge Function.
--
-- IMPORTANT: replace <SERVICE_ROLE_KEY> below with your *current* service-
-- role key before running this block (or store it in Vault — see notes).
-- The project URL is already filled in for your project.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule with this name (safe to run repeatedly)
select cron.unschedule('sync-sheets-hourly')
where exists (select 1 from cron.job where jobname = 'sync-sheets-hourly');

select cron.schedule(
  'sync-sheets-hourly',
  '0 * * * *',                              -- top of every hour
  $cron$
  select net.http_post(
    url     := 'https://rnywwfcxqrnrvcdkpsnz.supabase.co/functions/v1/sync-sheets',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object('trigger', 'scheduled')
  );
  $cron$
);
