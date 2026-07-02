-- =====================================================================
-- Migration 006 — Net-of-issues FIFO views
--   remaining = GRN weight - SUM(issued for the exact same coil number)
--   Fully consumed coils clamp to 0 (never negative) for display totals.
--   Matching key: coil_number (exact) in both grn_entries and issue_transactions.
-- =====================================================================

-- Issued total per coil
create or replace view public.v_coil_issued as
select
  coil_number,
  coalesce(sum(issued_qty), 0) as issued_total,
  count(*)                     as issue_count
from public.issue_transactions
where coil_number is not null
group by coil_number;

-- Net FIFO feed (mirrors v_fifo_queue + subtraction fields)
create or replace view public.v_fifo_net as
select
  f.id,
  f.coil_number,
  f.rm_code,
  g.heat_number,
  g.received_date,
  (current_date - g.received_date)                              as age_days,
  f.weight_available                                            as grn_weight,
  coalesce(ci.issued_total, 0)                                  as issued_total,
  greatest(f.weight_available - coalesce(ci.issued_total, 0), 0) as weight_remaining, -- clamped >= 0
  (f.weight_available - coalesce(ci.issued_total, 0))           as net_raw,            -- can be <= 0
  coalesce(ci.issue_count, 0)                                   as issue_count,
  g.source,
  f.status,
  f.location_code,
  cl.rack,
  (f.location_code is not null)                                 as has_location,
  f.hidden,
  row_number() over (
    partition by f.rm_code
    order by g.received_date asc, f.coil_number asc
  )                                                             as fifo_sequence
from public.fifo_lots f
join public.grn_entries g          on g.coil_number = f.coil_number
left join public.v_coil_issued ci  on ci.coil_number = f.coil_number
left join public.coil_locations cl on cl.coil_number = f.coil_number;

-- Per-RM summary for the net picker
create or replace view public.v_fifo_net_rm_summary as
select
  n.rm_code,
  coalesce(max(d.description), max(rm.description))      as description,
  count(*)::int                                          as total_lots,
  coalesce(sum(n.weight_remaining), 0)                  as total_remaining,
  count(*) filter (where n.net_raw <= 0)::int           as depleted,
  count(*) filter (where not n.has_location)::int       as no_rack
from public.v_fifo_net n
left join public.dashboard_data d on d.rm_code = n.rm_code
left join public.rm_master      rm on rm.rm_code = n.rm_code
group by n.rm_code;

-- KPI strip for the net board
create or replace view public.v_fifo_net_kpis as
select
  count(*)::int                                              as total_lots,
  coalesce(sum(weight_remaining), 0)                         as remaining_kg,
  count(*) filter (where net_raw <= 0)::int                  as depleted,
  count(*) filter (where net_raw > 0 and age_days > 60)::int as critical_aging
from public.v_fifo_net;

grant select on public.v_coil_issued          to authenticated;
grant select on public.v_fifo_net             to authenticated;
grant select on public.v_fifo_net_rm_summary  to authenticated;
grant select on public.v_fifo_net_kpis        to authenticated;
