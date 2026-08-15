-- ============================================================================
-- CRM + Admin Panel — database schema (Supabase / Postgres)
--
-- This is the CRM's OWN database. It stores CRM-native data only:
-- leads, notes, tags, follow-ups, lead history, CRM admins, roles, audit logs,
-- alerts, and a SHORT-TTL cache of investor snapshots for dashboard speed.
--
-- It never stores platform balances/KYC as a source of truth — those are pulled
-- live from vtmarkets via the integration API (see src/lib/crypto-platform).
--
-- Apply in the Supabase SQL editor (or `supabase db push`). RLS is enabled and
-- the app authorizes every privileged action server-side as well.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type crm_role as enum ('owner','admin','manager','agent','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new','contacted','qualified','proposal','converted','lost','unresponsive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_source as enum ('meta','manual','import','referral','organic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_type as enum ('large_deposit','large_withdrawal','dormant','kyc_sla','suspicious');
exception when duplicate_object then null; end $$;

-- A customer is sitting on the checkout processing screen waiting for an admin
-- to decide where to send them. Unlike the large_* alerts this is not about
-- amount — any held deposit blocks a real person, so it fires regardless of size.
alter type alert_type add value if not exists 'checkout_waiting';

-- ---------------------------------------------------------------------------
-- CRM admins — one row per authenticated CRM user (maps to auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists crm_admins (
  id          uuid primary key,               -- = auth.users.id
  email       text unique not null,
  full_name   text,
  role        crm_role not null default 'agent',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helper: current user's CRM role (used by RLS policies). SECURITY DEFINER so
-- it can read crm_admins regardless of the caller's own row policies.
create or replace function current_crm_role() returns crm_role as $$
  select role from crm_admins where id = auth.uid() and active = true;
$$ language sql stable security definer;

create or replace function is_crm_member() returns boolean as $$
  select exists (select 1 from crm_admins where id = auth.uid() and active = true);
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- Tags catalog
-- ---------------------------------------------------------------------------
create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  color      text default '#64748b',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  source            lead_source not null default 'manual',
  status            lead_status not null default 'new',

  full_name         text,
  email             text,
  phone             text,
  country           text,

  -- Meta provenance
  meta_lead_id      text unique,               -- dedupe against Meta leadgen id
  meta_form_id      text,
  meta_form_name    text,
  meta_campaign     text,
  meta_raw          jsonb,                     -- full field payload from Meta

  assigned_to       uuid references crm_admins(id) on delete set null,
  tags              text[] not null default '{}',

  -- Link to the vtmarkets platform user once converted (id is a string uuid
  -- from vtmarkets — stored as text; the CRM never FKs into the platform DB).
  platform_user_id  text,
  converted_at      timestamptz,

  notes_count       int not null default 0,
  created_by        uuid references crm_admins(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_leads_status   on leads(status);
create index if not exists idx_leads_assigned on leads(assigned_to);
create index if not exists idx_leads_email     on leads(lower(email));
create index if not exists idx_leads_platform  on leads(platform_user_id);
create index if not exists idx_leads_created    on leads(created_at desc);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
create table if not exists lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  author_id   uuid references crm_admins(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notes_lead on lead_notes(lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Follow-ups / tasks
-- ---------------------------------------------------------------------------
create table if not exists lead_followups (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  assigned_to uuid references crm_admins(id) on delete set null,
  due_at      timestamptz not null,
  title       text not null,
  done        boolean not null default false,
  done_at     timestamptz,
  created_by  uuid references crm_admins(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_followups_lead on lead_followups(lead_id);
create index if not exists idx_followups_due  on lead_followups(due_at) where done = false;

-- ---------------------------------------------------------------------------
-- Lead history (created, contacted, status change, note, conversion, ...)
-- ---------------------------------------------------------------------------
create table if not exists lead_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  actor_id    uuid references crm_admins(id) on delete set null,
  type        text not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_history_lead on lead_history(lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit log — every privileged action in the CRM
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references crm_admins(id) on delete set null,
  actor_email  text,
  action       text not null,
  entity_type  text,
  entity_id    text,
  data         jsonb not null default '{}'::jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_created on audit_logs(created_at desc);
create index if not exists idx_audit_actor   on audit_logs(actor_id);

-- ---------------------------------------------------------------------------
-- Investor snapshot cache — SHORT TTL. Never the source of truth.
-- Fed by (a) the platform integration API on demand and (b) inbound webhooks.
-- ---------------------------------------------------------------------------
create table if not exists investor_cache (
  platform_user_id text primary key,
  lead_id          uuid references leads(id) on delete set null,
  snapshot         jsonb not null,
  fetched_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Alerts / flags
-- ---------------------------------------------------------------------------
create table if not exists alerts (
  id                uuid primary key default gen_random_uuid(),
  type              alert_type not null,
  severity          text not null default 'info',   -- info | warning | critical
  platform_user_id  text,
  lead_id           uuid references leads(id) on delete set null,
  title             text not null,
  data              jsonb not null default '{}'::jsonb,
  acknowledged      boolean not null default false,
  acknowledged_by   uuid references crm_admins(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_alerts_open on alerts(created_at desc) where acknowledged = false;

-- ---------------------------------------------------------------------------
-- Non-secret integration settings (Meta connected?, thresholds, ...). Secrets
-- (tokens, keys) live in env vars, NOT here.
-- ---------------------------------------------------------------------------
create table if not exists integration_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function crm_set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$ begin
  create trigger trg_leads_updated before update on leads
    for each row execute function crm_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_admins_updated before update on crm_admins
    for each row execute function crm_set_updated_at();
exception when duplicate_object then null; end $$;

-- Keep notes_count in sync for list performance.
create or replace function crm_bump_notes_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then update leads set notes_count = notes_count + 1 where id = new.lead_id;
  elsif tg_op = 'DELETE' then update leads set notes_count = greatest(0, notes_count - 1) where id = old.lead_id;
  end if;
  return null;
end;
$$ language plpgsql;

do $$ begin
  create trigger trg_notes_count after insert or delete on lead_notes
    for each row execute function crm_bump_notes_count();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table crm_admins           enable row level security;
alter table leads                enable row level security;
alter table lead_notes           enable row level security;
alter table lead_followups       enable row level security;
alter table lead_history         enable row level security;
alter table tags                 enable row level security;
alter table audit_logs           enable row level security;
alter table investor_cache       enable row level security;
alter table alerts               enable row level security;
alter table integration_settings enable row level security;

-- crm_admins: a member can read the roster; only owners/admins can modify.
drop policy if exists p_admins_read on crm_admins;
create policy p_admins_read on crm_admins for select using (is_crm_member());
drop policy if exists p_admins_write on crm_admins;
create policy p_admins_write on crm_admins for all
  using (current_crm_role() in ('owner','admin'))
  with check (current_crm_role() in ('owner','admin'));

-- Generic "any active member can read" + "non-viewers can write" for CRM data.
-- Privileged/destructive actions are additionally enforced in server code.
do $$
declare t text;
begin
  foreach t in array array['leads','lead_notes','lead_followups','lead_history','tags','alerts'] loop
    execute format('drop policy if exists p_%1$s_read on %1$s;', t);
    execute format('create policy p_%1$s_read on %1$s for select using (is_crm_member());', t);
    execute format('drop policy if exists p_%1$s_write on %1$s;', t);
    execute format($f$create policy p_%1$s_write on %1$s for all
      using (current_crm_role() in ('owner','admin','manager','agent'))
      with check (current_crm_role() in ('owner','admin','manager','agent'));$f$, t);
  end loop;
end $$;

-- Audit logs: readable by managers+, insert-only for members (no update/delete).
drop policy if exists p_audit_read on audit_logs;
create policy p_audit_read on audit_logs for select
  using (current_crm_role() in ('owner','admin','manager'));
drop policy if exists p_audit_insert on audit_logs;
create policy p_audit_insert on audit_logs for insert with check (is_crm_member());

-- Investor cache + settings: readable by members. Writes go through the service
-- role (server) which bypasses RLS, so no write policy is exposed to clients.
drop policy if exists p_cache_read on investor_cache;
create policy p_cache_read on investor_cache for select using (is_crm_member());
drop policy if exists p_settings_read on integration_settings;
create policy p_settings_read on integration_settings for select using (is_crm_member());
