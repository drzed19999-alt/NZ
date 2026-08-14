-- ============================================================================
-- CRM bootstrap seed.
--
-- The FIRST CRM admin (an "owner") must be linked to a Supabase Auth user.
-- Auth users can't be created from plain SQL, so bootstrap in two steps:
--
-- 1) Create the auth user (any ONE of these):
--    a. Supabase Dashboard → Authentication → Users → "Add user"
--       (email + password, mark email confirmed), OR
--    b. From the CRM server once one owner exists, use "Add admin" in the UI, OR
--    c. Admin API:
--         curl -X POST 'https://YOURPROJECT.supabase.co/auth/v1/admin/users' \
--           -H "apikey: <SERVICE_ROLE_KEY>" \
--           -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--           -H "Content-Type: application/json" \
--           -d '{"email":"owner@vtmarkets.example","password":"ChangeMe123!","email_confirm":true}'
--
-- 2) Copy the new user's UUID, then run the insert below with it.
-- ============================================================================

-- Replace both placeholders, then run:
insert into crm_admins (id, email, full_name, role, active)
values (
  '00000000-0000-0000-0000-000000000000',   -- <-- auth.users.id of your owner
  'owner@vtmarkets.example',                  -- <-- same email
  'CRM Owner',
  'owner',
  true
)
on conflict (id) do update
  set role = 'owner', active = true;

-- Optional starter tags
insert into tags (name, color) values
  ('hot', '#ef4444'),
  ('warm', '#f59e0b'),
  ('vip', '#8b5cf6')
on conflict (name) do nothing;
