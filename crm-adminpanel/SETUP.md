# Setup from ZERO — vtmarkets platform + CRM

No prior setup assumed. You'll install Node, create a Supabase account and **two**
databases, then run both apps. ~30–40 min the first time.

Final result — three things running:
```
vtmarkets/server  (Node API + Postgres)   → http://localhost:4000
vtmarkets/*.html  (static frontend)        → http://localhost:5500
crm-adminpanel    (Next.js CRM)            → http://localhost:3000
```

---

# PART 0 — Install the tools (once)

### 0.1 Node.js
1. Go to **https://nodejs.org** → download the **LTS** installer for Windows.
2. Run it, click Next through the defaults, finish.
3. Open a **new** PowerShell window and check:
   ```powershell
   node -v
   npm -v
   ```
   Both should print a version. If `node -v` shows v18.17 or higher, you're good.

### 0.2 Generate your secret values (keep this window open)
Run this **four times** and paste each result into a notepad — label them #1–#4:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
- **#1** = `JWT_SECRET`
- **#2** = `CRM_API_KEY` (used by BOTH apps)
- **#3** = `CRM_WEBHOOK_SECRET` (used by BOTH apps)
- **#4** = spare (in case you need another)

---

# PART 1 — Create the Supabase account + two databases

### 1.1 Sign up
1. Go to **https://supabase.com** → **Start your project** → sign in (GitHub or email).
2. If asked, create an **Organization** (any name, Free plan).

### 1.2 Create Project A — the PLATFORM database
1. Click **New project**.
2. **Name:** `vtmarkets-platform`
3. **Database Password:** click *Generate a password*, then **COPY IT to your notepad**
   (label it "Platform DB password"). You need it in a minute.
4. **Region:** pick the one closest to you.
5. **Create new project.** Wait ~2 minutes until it says the project is ready.

### 1.3 Create Project B — the CRM database
Repeat 1.2 with:
- **Name:** `vtmarkets-crm`
- **Database Password:** generate + **COPY** (label "CRM DB password").

Wait for both projects to finish provisioning before continuing.

---

# PART 2 — Set up the PLATFORM database (Project A)

### 2.1 Create the tables
1. Open **Project A** (`vtmarkets-platform`).
2. Left sidebar → **SQL Editor** → **New query**.
3. Open the file `vtmarkets/server/db/schema.sql` on your computer, select **all**,
   copy, paste into the editor.
4. Click **Run** (or Ctrl+Enter). You should see "Success. No rows returned".

### 2.2 Get the connection string (for the Node server)
1. At the **top of the page**, click the green **`Connect`** button (in the header bar,
   near the project name).
2. In the **"Connect to your project"** popup, find the **Session pooler** section
   (there are usually three: Direct connection, Transaction pooler, Session pooler).
   Pick **Session pooler** — port **5432**, host ends in `.pooler.supabase.com`.
3. Copy the string. It looks like:
   ```
   postgresql://postgres.abcxyz:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
   ```
4. Replace **`[YOUR-PASSWORD]`** with your **Platform DB password** from step 1.2.
5. Keep this final string in your notepad — it's your `DATABASE_URL`.

> **Use Session pooler**, not Transaction pooler (6543) — the latter breaks our queries.
> No "Connect" button? Use **Settings (gear) → Database → Connection string → Session
> pooler → URI**, or build it manually from your **Reference ID** (Settings → General)
> and region:
> `postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres`

---

# PART 3 — Run the PLATFORM backend

Open PowerShell in the project.

```powershell
cd C:\ZkStatTion\Websites\vtmarkets\server
npm install
copy .env.example .env
notepad .env
```
In the `.env` file that opens, set these (leave the rest as-is):
```ini
PORT=4000
DATABASE_URL=<the Session pooler string from step 2.2, with your password>
DATABASE_SSL=true
JWT_SECRET=<secret #1>
CRM_API_KEY=<secret #2>
CRM_WEBHOOK_URL=http://localhost:3000/api/webhooks/platform
CRM_WEBHOOK_SECRET=<secret #3>
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
FRONTEND_BASE_URL=http://localhost:5500
```
Save and close Notepad. Then:
```powershell
npm run seed         # loads demo users/balances/KYC/transactions into Project A
npm run dev          # starts the API on http://localhost:4000
```
**Check it:** open **http://localhost:4000/health** in your browser → you should see
`{"ok":true,...}`.

> `npm run seed` also proves your `DATABASE_URL` works. If it errors with a connection
> problem, fix the string (step 2.2) before continuing.

Leave this terminal running.

---

# PART 4 — Run the PLATFORM frontend

Open a **new** PowerShell window:
```powershell
cd C:\ZkStatTion\Websites\vtmarkets
npx serve -l 5500
```
(If it asks to install `serve`, type **y**.)

Open **http://localhost:5500/login.html**, sign in with a seeded account:
- Email: `amelie.rousseau@example.com`  ·  Password: `Password123!`

You should land on `home.html` with real balances/KYC/transactions. Leave this running.

---

# PART 5 — Set up the CRM database (Project B)

### 5.1 Create the tables
1. Open **Project B** (`vtmarkets-crm`).
2. **SQL Editor** → **New query**.
3. Open `crm-adminpanel/supabase/schema.sql`, copy all, paste, **Run**.

### 5.2 Create your login (the first admin)
1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter **your email** + a password you'll remember. **Tick "Auto Confirm User".** Create.
3. In the users list, click the new user and **copy its UID** (a UUID).

### 5.3 Link that login to an owner role
1. **SQL Editor** → **New query** → paste this, replacing the two placeholders:
   ```sql
   insert into crm_admins (id, email, full_name, role, active)
   values ('PASTE-THE-UID-HERE', 'your-email@example.com', 'Owner', 'owner', true)
   on conflict (id) do update set role = 'owner', active = true;
   ```
2. **Run.**

### 5.4 Get the CRM API keys
1. **Settings** → **API**.
2. Copy three things: **Project URL**, **anon public** key, and **service_role** key
   (click reveal). Keep them in your notepad.

---

# PART 6 — Run the CRM

New PowerShell window:
```powershell
cd C:\ZkStatTion\Websites\crm-adminpanel
npm install
copy .env.example .env.local
notepad .env.local
```
Set these:
```ini
NEXT_PUBLIC_SUPABASE_URL=<Project URL from 5.4>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

CRYPTO_PLATFORM_API_URL=http://localhost:4000
CRYPTO_PLATFORM_API_KEY=<secret #2 — SAME as the platform's CRM_API_KEY>
PLATFORM_WEBHOOK_SECRET=<secret #3 — SAME as the platform's CRM_WEBHOOK_SECRET>

NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Save, close Notepad, then:
```powershell
npm run dev          # http://localhost:3000
```
Open **http://localhost:3000**, sign in with the email + password from **step 5.2**.

---

# PART 7 — Verify the whole thing works

1. **Leads** → **+ New lead** → give it a name + a real-looking email → Create.
2. Open the lead → **Convert to user**. (The activation email is printed in the
   *platform* terminal since SMTP isn't set — that's expected.)
3. **Investors** → open that user → you'll see the live snapshot. As owner you get
   **Admin controls** to edit profile / KYC / credit-debit balance.
4. **Settings** page → change the "Large transaction threshold" and Save — that's the
   in-UI config editing (stored in the DB).
5. **Audit log** → every action you just did is recorded.

Done. 🎉

---

## The must-match values (double-check if something fails)

| CRM `.env.local` | Platform `vtmarkets/server/.env` |
|---|---|
| `CRYPTO_PLATFORM_API_KEY` | = `CRM_API_KEY` (secret #2) |
| `PLATFORM_WEBHOOK_SECRET` | = `CRM_WEBHOOK_SECRET` (secret #3) |

## Which terminals stay open
1. Platform API (`npm run dev` in `vtmarkets/server`)
2. Platform frontend (`npx serve -l 5500` in `vtmarkets`)
3. CRM (`npm run dev` in `crm-adminpanel`)

## Common first-time issues
- **Server won't connect to DB** → wrong `DATABASE_URL` password, or use the
  **Session pooler** string (Part 2.2). Keep `DATABASE_SSL=true`.
- **CRM "Invalid API key"** → `NEXT_PUBLIC_SUPABASE_*` are from the CRM project (B), not A.
- **Can't sign in to CRM** → you skipped 5.3 (the `crm_admins` insert), or didn't tick
  "Auto Confirm User" in 5.2.
- **Login on the platform frontend fails** → make sure Part 3 is running and you're
  visiting via `http://localhost:5500` (not opening the .html file directly).

## Optional later
- **Real emails:** set `SMTP_*` in both `.env` files.
- **Meta leads:** set the `META_*` vars in the CRM and register the webhook shown on the
  Settings page. Manual leads work without it.
