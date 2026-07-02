-- =====================================================================
-- Migration 007 — Net board shows ACTIVE coils only (hide consumed)
-- A coil with net_raw <= 0 (fully issued) is excluded from the picker
-- summary and KPIs. RMs whose coils are all consumed drop off the picker.
-- The queue itself is filtered in the app (net_raw > 0).
-- =====================================================================

create or replace view public.v_fifo_net_rm_summary as
select
  n.rm_code,
  coalesce(max(d.description), max(rm.description))               as description,
  count(*) filter (where n.net_raw > 0)::int                     as total_lots,
  coalesce(sum(n.weight_remaining), 0)                           as total_remaining,
  count(*) filter (where n.net_raw <= 0)::int                    as depleted,
  count(*) filter (where n.net_raw > 0 and not n.has_location)::int as no_rack
from public.v_fifo_net n
left join public.dashboard_data d on d.rm_code = n.rm_code
left join public.rm_master      rm on rm.rm_code = n.rm_code
group by n.rm_code
having count(*) filter (where n.net_raw > 0) > 0;   -- hide fully-consumed materials

create or replace view public.v_fifo_net_kpis as
select
  count(*) filter (where net_raw > 0)::int                            as total_lots,
  coalesce(sum(weight_remaining) filter (where net_raw > 0), 0)       as remaining_kg,
  count(*) filter (where net_raw > 0 and age_days > 60)::int          as critical_aging,
  count(*) filter (where net_raw <= 0)::int                           as depleted
from public.v_fifo_net;

grant select on public.v_fifo_net_rm_summary to authenticated;
grant select on public.v_fifo_net_kpis       to authenticated;
