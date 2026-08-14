# VT Markets — CRM & Admin Panel

A **standalone** CRM and live admin panel for VT Markets. Ingests Meta leads,
manages the full lead lifecycle, converts leads into platform users, and gives
admins a **live, unified investor-monitoring view** — all while talking to the
`vtmarkets` crypto platform only through its authenticated integration API and
webhooks.

It is developed, run, and deployed **independently** of `vtmarkets`. The link
between them is pure configuration (URLs + API keys).

```
Meta Ads ─▶ CRM + Admin Panel ─▶ authenticated API / webhooks ─▶ vtmarkets platform
                │
                └─ own database (Supabase): leads, notes, audit, admins, short-TTL investor cache
```

## Stack

- **Next.js 14** (App Router, TypeScript) — UI + server-side API routes
- **Supabase** — the CRM's own Postgres DB, Auth, RLS, and Realtime (live dashboard)
- **Tailwind CSS**
- Server-side authorization (RBAC) on every privileged action — never frontend-only

## What it does

- **Leads:** Meta auto-ingestion **and** manual creation; search/filter; assign;
  statuses; tags; notes; follow-ups; full per-lead history timeline.
- **Conversion:** turn a lead into a `vtmarkets` user — detects existing users by
  email (dedupe), creates **or** links, records the link both sides, and triggers
  the platform's secure activation/password flow (no plaintext passwords).
- **Investor monitoring:** live directory of every converted user (filter by status,
  KYC, source/campaign, assigned rep; sort by last-active / deposited / balance),
  online/last-active presence, live balances/transactions/positions/KYC, a **single
  unified timeline** (CRM history + platform activity + transactions), and alerts
  (large deposit/withdrawal, dormant, KYC SLA).
- **Admin ops:** authorized platform actions (suspend/reactivate, resend activation)
  performed through the platform API with audit + auth.
- **CRM admins & roles:** owner / admin / manager / agent / viewer with a server-side
  permission matrix mirrored by RLS.
- **Audit log:** every privileged action recorded, append-only.
- **Live dashboard:** Supabase Realtime pushes new leads/alerts to the UI without polling.

## Data freshness (push vs poll)

- **Push (preferred, "live"):** `vtmarkets` sends HMAC-signed webhooks to
  `POST /api/webhooks/platform` on login, deposit/withdrawal, KYC change, and status
  change. The CRM refreshes the investor's cached snapshot, merges the event into the
  lead timeline, and evaluates alerts immediately. New leads/alerts reach the browser
  via Supabase Realtime.
- **Poll (on demand):** opening an investor pulls live balances/transactions/positions
  from the platform API. The snapshot is cached in `investor_cache` with a short TTL
  (`INVESTOR_CACHE_TTL_SECONDS`, default 60s) so many admins viewing the dashboard
  don't hammer the platform API. **The cache is never the source of truth.**

## Setup

```bash
cd crm-adminpanel
npm install
cp .env.example .env.local     # fill in Supabase + platform + (optional) Meta/SMTP
```

1. **Create the database.** In your Supabase project's SQL editor, run
   `supabase/schema.sql` (tables, triggers, RLS). This DB is the CRM's own — do
   **not** point it at the vtmarkets database.
2. **Bootstrap the first admin.** Follow `supabase/seed.sql` (create a Supabase Auth
   user, then insert a matching `crm_admins` row with role `owner`).
3. **Run it.**
   ```bash
   npm run dev            # http://localhost:3000
   ```
   Sign in with the owner credentials. Add more admins from the **CRM Admins** page.

## Required environment variables

See `.env.example` for the annotated list. Essentials:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CRM database + auth (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged writes (audit, cache, admin mgmt) |
| `CRYPTO_PLATFORM_API_URL` | Base URL of the vtmarkets backend |
| `CRYPTO_PLATFORM_API_KEY` | Must equal vtmarkets' `CRM_API_KEY` |
| `PLATFORM_WEBHOOK_SECRET` | Must equal vtmarkets' `CRM_WEBHOOK_SECRET` (verifies inbound webhooks) |
| `META_APP_SECRET` / `META_VERIFY_TOKEN` / `META_PAGE_ACCESS_TOKEN` | Meta Lead Ads (optional) |
| `SMTP_*` | Sending email to leads/users (optional; logs if unset) |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app (webhook/link building) |
| `ALERT_*` | Alert thresholds |

**The CRM is fully usable without Meta and without the platform API** — manual leads
and CRM workflows work; investor pages show an honest "platform not connected" state
until `CRYPTO_PLATFORM_*` is set.

## Meta integration

1. Deploy the CRM (Meta needs a public HTTPS URL).
2. In the Meta App → Webhooks, add the callback `https://<app>/api/webhooks/meta`,
   use your `META_VERIFY_TOKEN`, and subscribe to the **`leadgen`** field.
3. Set `META_APP_SECRET` (verifies payloads) and a long-lived `META_PAGE_ACCESS_TOKEN`
   (fetches each lead's field data from the Graph API).
4. New form submissions now appear automatically as leads (deduped by `meta_lead_id`).

## Deploy (independent of vtmarkets)

- **App:** Vercel (or any Node host). Set all env vars in the host. `npm run build`.
- **Database:** Supabase (managed). Run `supabase/schema.sql` once.
- The only coupling to vtmarkets is the configured `CRYPTO_PLATFORM_API_URL` +
  `CRYPTO_PLATFORM_API_KEY` and the shared webhook secret — no shared filesystem or DB.

## Security notes

- Every API route calls `requirePermission(...)` / `requireAdmin()` server-side; RLS
  is a second layer. The frontend `can()` only hides controls.
- The service-role key is server-only (`src/lib/supabase/admin.ts`, `import 'server-only'`).
- Webhooks are HMAC-verified (`/api/webhooks/meta`, `/api/webhooks/platform`) and rate-limited.
- Secrets live in env vars, never in the database; input is validated with Zod.
- The CRM never connects to the vtmarkets database and never stores platform balances
  as a source of truth.
