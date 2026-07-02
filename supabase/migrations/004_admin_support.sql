-- =====================================================================
-- Migration 004 — admin module support
--   1. Relax location_master code format (real codes are R12-C3, not R2-B4-L1)
--   2. Let admins write audit_logs (client-side mutations log their changes)
--   3. Allow the app to call run_fifo_merge() after a location assignment
-- =====================================================================

-- 1. Location code: allow letters/digits and - . / space (e.g. R12-C3)
alter table public.location_master
  drop constraint if exists location_master_location_code_check;
alter table public.location_master
  add constraint location_master_location_code_check
  check (location_code ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]*$');

-- 2. Admins may insert audit rows (read policy already exists from 001)
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert on public.audit_logs
  for insert to authenticated
  with check (public.is_admin());

-- 3. Authenticated admins can trigger the merge (e.g. after assigning a rack)
grant execute on function public.run_fifo_merge() to authenticated;
