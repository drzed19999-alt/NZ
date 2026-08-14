# VT Markets — Platform Backend

A real backend + database for the VT Markets platform. Replaces the old
hardcoded/mock markup with data served from Postgres, and exposes a **secure
integration API** the CRM (`/crm-adminpanel`) uses to monitor investors and
convert leads into platform users.

> This lives at `vtmarkets/server/`. It is **additive** — no existing frontend
> files were moved or rewritten by adding it. The frontend was rewired to call
> these endpoints (see `../homesubfiles/api-client.js`), except `index.html`,
> which was left untouched.

## Stack

- Node.js + Express
- Postgres (Supabase Postgres or any Postgres) via `pg`
- bcrypt password hashing, JWT customer sessions
- API-key auth + HMAC-signed webhooks for the CRM integration

## Setup

```bash
cd vtmarkets/server
npm install
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET, CRM_API_KEY, ...
npm run migrate             # apply db/schema.sql
npm run seed                # load realistic demo data (users, balances, KYC, txns)
npm run dev                 # http://localhost:4000
```

Seeded active users log in with password **`Password123!`** (e.g.
`amelie.rousseau@example.com`).

## API surface

### Customer API (browser, JWT) — `/api/auth`, `/api/me`
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/activate`
- `GET  /api/auth/me` · `POST /api/auth/logout` · `POST /api/auth/resend-activation`
- `GET  /api/me/balances` · `/transactions` · `/positions` · `/kyc`
- `POST /api/me/deposit` · `/withdraw` · `/kyc`

### Integration API (CRM, API key) — `/api/integration/v1`
Auth: `Authorization: Bearer <CRM_API_KEY>` or `X-API-Key: <CRM_API_KEY>`.
- `GET  /users` (search/filter/sort/paginate), `GET /users/lookup?email=`
- `GET  /stats`
- `GET  /users/:id` (snapshot), `/balances` `/transactions` `/positions` `/kyc` `/presence` `/activity`
- `POST /users` (create+activation), `POST /users/:id/link`, `/send-activation`, `/status`
- **Admin edits:** `PATCH /users/:id` (profile/email), `POST /users/:id/kyc` (override),
  `POST /users/:id/balance` (credit/debit — transactional, records an `adjustment`
  transaction, rejects debits beyond balance)

### Webhooks (push to CRM)
On login, deposit/withdrawal, KYC change, user create/activate/status change,
the server POSTs to `CRM_WEBHOOK_URL` with header
`X-VT-Signature: sha256=<hmac(CRM_WEBHOOK_SECRET, body)>`.

## Presence

`users.last_active_at` is updated on every authenticated customer request.
"Online" means active within `PRESENCE_ONLINE_WINDOW_MINUTES`. This is an
honest last-active signal, not a websocket presence system — the API labels it
`signal: "last_active"`.

## Deploy

Any Node host (Render, Railway, Fly, a VM). Set the env vars from `.env.example`,
point `DATABASE_URL` at your Supabase/Postgres instance, run `npm run migrate`
once, then `npm start`. It does not depend on the CRM's location — only on the
shared `CRM_API_KEY` / webhook secret.
