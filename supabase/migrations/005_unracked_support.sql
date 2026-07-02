-- =====================================================================
-- Migration 005 — unracked worklist support
--   1. fifo_lots.hidden — a soft "marked / handled" flag. Coils stay in the
--      DB and on the sheet; this just drops them off the unracked worklist.
--      The merge never touches it, so a manual mark persists across syncs.
--   2. v_fifo_queue exposes `hidden` so the worklist can filter it out.
-- =====================================================================

alter table public.fifo_lots add column if not exists hidden boolean not null default false;

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
  )                                                       as fifo_sequence,
  f.hidden
from public.fifo_lots f
join public.grn_entries g          on g.coil_number = f.coil_number
left join public.coil_locations cl on cl.coil_number = f.coil_number;

grant select on public.v_fifo_queue to authenticated;
