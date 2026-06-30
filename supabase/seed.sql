-- =====================================================================
-- Seed / bootstrap data for local + first deploy
-- =====================================================================

-- A few RM master rows matching the reference screenshot so the app has
-- something to render before the first sheet sync. Safe to delete later.
insert into public.rm_master (rm_code, description, plant, status) values
  ('RM467', '15B25-5.70/5.75-PPD',          'Khatwad', 'active'),
  ('RM709', '10B21-12.50/12.55-DAPPD',      'Khatwad', 'active'),
  ('RM708', '10B21-12.00/12.05-DAPPD',      'Khatwad', 'active'),
  ('RM043', '15B25-10.68/10.72-PPD',        'Khatwad', 'active'),
  ('RM738', '10B21-8.60/8.65-DAPPD-MUKUND-9MM', 'Khatwad', 'active'),
  ('RM690', 'SAE1010-11.60/11.65-DAPPD',    'Khatwad', 'active'),
  ('RM160', 'SAE1018-24.60/24.65MM-DAPPD',  'Khatwad', 'active')
on conflict (rm_code) do nothing;

-- A couple of valid rack locations for the "+ Add rack" dropdown.
insert into public.location_master (location_code, rack, bay, row_no, level_no) values
  ('R2-B4-L1', 'R2', 'B4', '1', '1'),
  ('R2-B1-L1', 'R2', 'B1', '1', '1')
on conflict (location_code) do nothing;

-- ---------------------------------------------------------------------
-- Promote your account to admin AFTER you sign up once via the app.
-- Replace the email, then run this in the Supabase SQL editor:
--
--   update public.users set role = 'admin' where email = 'you@metaforge.in';
--
-- (handle_new_user creates every new auth user as 'viewer' by default.)
-- ---------------------------------------------------------------------
