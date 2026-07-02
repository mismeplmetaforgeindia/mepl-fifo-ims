-- =====================================================================
-- Migration 003 — FIFO board read views
--   v_fifo_rm_summary : one row per RM for the left material picker
--   v_fifo_kpis       : single-row KPI strip totals
-- Both build on v_fifo_queue (sequence + age computed there). Read-only,
-- no inventory math beyond counting/summing what's already in the lots.
-- =====================================================================

create or replace view public.v_fifo_rm_summary as
select
  q.rm_code,
  coalesce(max(d.description), max(rm.description))      as description,
  count(*)::int                                          as total_lots,
  coalesce(sum(q.weight_available), 0)                   as total_weight,
  count(*) filter (where not q.has_location)::int        as no_rack,
  count(*) filter (where q.has_location)::int            as racked
from public.v_fifo_queue q
left join public.dashboard_data d on d.rm_code = q.rm_code
left join public.rm_master      rm on rm.rm_code = q.rm_code
group by q.rm_code;

create or replace view public.v_fifo_kpis as
select
  count(*)::int                                          as total_lots,
  coalesce(sum(weight_available), 0)                     as available_kg,
  count(*) filter (where age_days > 60)::int             as critical_aging,
  count(*) filter (where not has_location)::int          as pending_rack
from public.v_fifo_queue;

-- Expose the views to the logged-in role (PostgREST reads as `authenticated`)
grant select on public.v_fifo_queue       to authenticated;
grant select on public.v_fifo_rm_summary  to authenticated;
grant select on public.v_fifo_kpis        to authenticated;
