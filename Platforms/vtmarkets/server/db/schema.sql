-- ============================================================================
-- VT Markets platform database schema (Postgres / Supabase)
--
-- This is the crypto platform's OWN database. It is completely separate from
-- the CRM database. The CRM never connects here directly — it only talks to
-- the integration API (see src/routes/integration.routes.js).
--
-- Apply with:  npm run migrate      (runs this file)
-- or paste into the Supabase SQL editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_status  as enum ('pending', 'active', 'restricted', 'suspended', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role    as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('spot', 'futures', 'funding');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_type     as enum ('deposit', 'withdrawal', 'trade', 'fee', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_status   as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_status   as enum ('none', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type position_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  password_hash     text,                                  -- null until activated
  first_name        text,
  last_name         text,
  phone             text,
  country           text,
  status            user_status not null default 'pending',
  role              user_role   not null default 'user',

  -- Account-opening / activation flow
  activation_token  text,
  activation_sent_at timestamptz,
  activated_at      timestamptz,

  -- Presence signal (real, DB-backed — updated by the API on activity)
  last_login_at     timestamptz,
  last_active_at    timestamptz,

  -- Provenance: which CRM lead / Meta campaign this user originated from.
  -- Set when the CRM converts a lead into a platform user.
  crm_lead_id       text,
  source            text,                                  -- e.g. 'meta', 'manual', 'organic'
  source_campaign   text,

  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Set when an admin assigns a password directly (CRM onboarding). The user is
-- forced to choose their own password on first login. Added via ALTER so
-- re-running this file upgrades an existing database in place.
alter table users add column if not exists must_change_password boolean not null default false;

create index if not exists idx_users_status       on users(status);
create index if not exists idx_users_last_active   on users(last_active_at desc);
create index if not exists idx_users_crm_lead      on users(crm_lead_id);
create index if not exists idx_users_email_lower   on users(lower(email));

-- ---------------------------------------------------------------------------
-- Accounts / wallets (a user has several balances)
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  type         account_type not null,
  currency     text not null default 'USD',
  balance      numeric(20,2) not null default 0,
  updated_at   timestamptz not null default now(),
  unique (user_id, type, currency)
);
create index if not exists idx_accounts_user on accounts(user_id);

-- ---------------------------------------------------------------------------
-- Transactions (deposits / withdrawals / trades / fees)
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  type         txn_type not null,
  status       txn_status not null default 'pending',
  asset        text not null default 'USD',
  amount       numeric(20,2) not null,
  currency     text not null default 'USD',
  method       text,                                       -- 'card', 'crypto', 'bank', ...
  reference    text,                                       -- external ref / tx hash
  note         text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_txn_user    on transactions(user_id, created_at desc);
create index if not exists idx_txn_type    on transactions(type);
create index if not exists idx_txn_status  on transactions(status);

-- ---------------------------------------------------------------------------
-- KYC records
-- ---------------------------------------------------------------------------
create table if not exists kyc_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  level         int  not null default 0,                   -- 0,1,2...
  status        kyc_status not null default 'none',
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewer_note text,
  documents     jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Trading positions
-- ---------------------------------------------------------------------------
create table if not exists positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  symbol       text not null,
  side         text not null default 'long',               -- 'long' | 'short'
  size         numeric(20,8) not null,
  entry_price  numeric(20,8) not null,
  mark_price   numeric(20,8),
  pnl          numeric(20,2) not null default 0,
  status       position_status not null default 'open',
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz
);
create index if not exists idx_positions_user on positions(user_id, status);

-- ---------------------------------------------------------------------------
-- Activity log (login/logout/api hits) — powers presence + the CRM timeline
-- ---------------------------------------------------------------------------
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  event       text not null,                               -- 'login','logout','deposit','withdrawal','kyc_update',...
  ip          text,
  user_agent  text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_user on activity_log(user_id, created_at desc);
create index if not exists idx_activity_event on activity_log(event);

-- ---------------------------------------------------------------------------
-- Platform API keys shown on the user's "API" page (institutional keys).
-- These are the END USER's keys, NOT the CRM integration key.
-- ---------------------------------------------------------------------------
create table if not exists user_api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  label        text not null,
  key_prefix   text not null,                              -- display only, e.g. 'vt_live_99a8f'
  key_hash     text not null,                              -- hash of the full key
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create index if not exists idx_user_api_keys_user on user_api_keys(user_id);

-- ---------------------------------------------------------------------------
-- Outbound webhook delivery log (vtmarkets -> CRM) for auditing/retries
-- ---------------------------------------------------------------------------
create table if not exists webhook_deliveries (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  target_url  text not null,
  payload     jsonb not null,
  status_code int,
  ok          boolean not null default false,
  attempts    int not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists idx_webhook_created on webhook_deliveries(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger trg_users_updated  before update on users
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_kyc_updated    before update on kyc_records
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- ProTrader Bot — per-user automation state.
--
-- The bot UI used to be entirely client-side with no server state, so nothing
-- an admin (or the user) configured survived a refresh and the CRM had nothing
-- to control. One row per user; created on demand.
-- ---------------------------------------------------------------------------
do $$ begin
  create type bot_status as enum ('stopped', 'running', 'paused', 'locked');
exception when duplicate_object then null; end $$;

create table if not exists bot_configs (
  user_id           uuid primary key references users(id) on delete cascade,
  status            bot_status not null default 'stopped',
  strategy          text not null default 'balanced',      -- 'conservative' | 'balanced' | 'aggressive'
  symbols           text[] not null default array['BTC/USDT'],
  max_position_size numeric(20,2) not null default 0,      -- 0 = no cap
  daily_loss_limit  numeric(20,2) not null default 0,
  take_profit_pct   numeric(6,2)  not null default 2.00,
  stop_loss_pct     numeric(6,2)  not null default 1.00,
  leverage          int           not null default 1,
  -- Admin kill-switch: when false the user cannot start the bot at all.
  enabled_by_admin  boolean not null default true,
  admin_note        text,
  updated_by        text,                                  -- 'user' | 'crm:<admin email>'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists bot_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  event      text not null,                                -- 'started','stopped','config_changed','locked',...
  actor      text,                                         -- 'user' | 'crm:<admin email>'
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_bot_events_user on bot_events(user_id, created_at desc);

do $$ begin
  create trigger trg_bot_configs_updated before update on bot_configs
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Saved payout / payment methods. The frontend previously shipped hardcoded
-- cards ("Visa Platinum •••• 4892 / John Doe") that every user saw.
-- ---------------------------------------------------------------------------
create table if not exists payment_methods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  kind         text not null,                              -- 'card' | 'bank' | 'crypto'
  label        text not null,
  masked       text not null,                              -- '•••• 4892' / 'GB89 •••• 8214'
  holder       text,
  detail       text,                                       -- expiry, SWIFT, network...
  is_default   boolean not null default false,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_payment_methods_user on payment_methods(user_id);
