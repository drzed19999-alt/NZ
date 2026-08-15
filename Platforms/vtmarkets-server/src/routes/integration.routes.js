'use strict';

// ============================================================================
// SECURE CRM INTEGRATION API  —  /api/integration/v1/*
//
// This is the ONLY surface the CRM talks to. Authenticated with the shared
// CRM_API_KEY (see auth/middleware.requireApiKey). Everything the CRM needs to
// power the investor-monitoring dashboard and to convert leads into platform
// users lives here.
//
// Design notes:
//  - The CRM never touches this database directly; it calls these endpoints.
//  - Financial/KYC/presence data is served LIVE from the platform DB — the CRM
//    is expected to cache it briefly (short TTL), not replicate it.
//  - Privileged actions (create/link user, change status) are audited via
//    activity_log and emit webhooks.
// ============================================================================

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const usersService = require('../services/users.service');
const { requireApiKey } = require('../auth/middleware');
const { asyncHandler, badRequest, notFound, conflict } = require('../lib/http');
const { randomToken, hashPassword } = require('../auth/password');
const serialize = require('../lib/serializers');
const webhooks = require('../lib/webhooks');
const { sendMail, activationEmail } = require('../lib/mailer');

const router = express.Router();
router.use(requireApiKey);

// Build the "investor snapshot" the CRM caches for the dashboard.
async function buildSnapshot(user) {
  const [summary, kyc, positions] = await Promise.all([
    usersService.getFinancialSummary(user.id),
    usersService.getKyc(user.id),
    usersService.getPositions(user.id, { status: 'open' }),
  ]);
  return {
    user: serialize.publicUser(user),
    presence: serialize.presence(user),
    financials: summary,
    kyc: serialize.kyc(kyc),
    open_positions: positions.length,
    account_status: user.status,
  };
}

// --- List / directory ---------------------------------------------------
// GET /users?search=&status=&kyc=&source=&sort=&limit=&offset=
router.get('/users', asyncHandler((req, res) => listUsers(req, res)));

async function listUsers(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const offset = parseInt(req.query.offset || '0', 10);
  const params = [];
  const conds = [];

  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    const i = params.length;
    conds.push(`(u.email ilike $${i} or u.first_name ilike $${i} or u.last_name ilike $${i})`);
  }
  if (req.query.status) { params.push(req.query.status); conds.push(`u.status = $${params.length}`); }
  if (req.query.source) { params.push(req.query.source); conds.push(`u.source = $${params.length}`); }
  if (req.query.kyc)    { params.push(req.query.kyc);    conds.push(`k.status = $${params.length}`); }

  let sql = `
    select u.*, k.status as kyc_status, k.level as kyc_level,
           coalesce(b.total_balance,0)  as total_balance,
           coalesce(d.total_deposited,0) as total_deposited
    from users u
    left join kyc_records k on k.user_id = u.id
    left join (select user_id, sum(balance) total_balance from accounts group by user_id) b on b.user_id = u.id
    left join (select user_id, sum(amount) total_deposited from transactions
               where type='deposit' and status='completed' group by user_id) d on d.user_id = u.id`;
  if (conds.length) sql += ' where ' + conds.join(' and ');

  const sort = ({
    last_active: 'u.last_active_at desc nulls last',
    total_deposited: 'total_deposited desc',
    total_balance: 'total_balance desc',
    created: 'u.created_at desc',
  })[req.query.sort] || 'u.last_active_at desc nulls last';
  sql += ` order by ${sort}`;

  params.push(limit); const li = params.length;
  params.push(offset); const oi = params.length;
  sql += ` limit $${li} offset $${oi}`;

  const { rows } = await db.query(sql, params);
  const users = rows.map((u) => ({
    ...serialize.publicUser(u),
    presence: serialize.presence(u),
    kyc: { status: u.kyc_status || 'none', level: u.kyc_level || 0 },
    total_balance: Number(u.total_balance),
    total_deposited: Number(u.total_deposited),
  }));

  const countRow = await db.one('select count(*)::int as n from users');
  res.json({ users, paging: { limit, offset, total: countRow.n } });
}

// --- Lookup (dedupe before conversion) ----------------------------------
// GET /users/lookup?email=
router.get('/users/lookup', asyncHandler(async (req, res) => {
  const email = String(req.query.email || '');
  if (!email) throw badRequest('email is required');
  const user = await usersService.findByEmail(email);
  res.json({ exists: !!user, user: user ? serialize.publicUser(user) : null });
}));

// --- Aggregate stats for dashboard tiles --------------------------------
router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await db.one(`
    select
      (select count(*) from users) as total_users,
      (select count(*) from users where status='active') as active_users,
      (select count(*) from users where last_active_at > now() - interval '${config.presence.onlineWindowMinutes} minutes') as online_now,
      (select count(*) from kyc_records where status='pending') as kyc_pending,
      (select coalesce(sum(balance),0) from accounts) as total_balance,
      (select coalesce(sum(amount),0) from transactions where type='deposit' and status='completed') as total_deposited
  `);
  res.json({
    total_users: Number(stats.total_users),
    active_users: Number(stats.active_users),
    online_now: Number(stats.online_now),
    kyc_pending: Number(stats.kyc_pending),
    total_balance: Number(stats.total_balance),
    total_deposited: Number(stats.total_deposited),
  });
}));

// --- Single user detail + snapshot --------------------------------------
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  res.json(await buildSnapshot(user));
}));

router.get('/users/:id/balances', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const accounts = await usersService.getBalances(user.id);
  const summary = await usersService.getFinancialSummary(user.id);
  res.json({ accounts: accounts.map(serialize.account), summary });
}));

router.get('/users/:id/transactions', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const rows = await usersService.getTransactions(user.id, {
    limit: parseInt(req.query.limit || '100', 10), type: req.query.type,
  });
  res.json({ transactions: rows.map(serialize.transaction) });
}));

router.get('/users/:id/positions', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const rows = await usersService.getPositions(user.id, { status: req.query.status || 'open' });
  res.json({ positions: rows.map(serialize.position) });
}));

router.get('/users/:id/kyc', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const kyc = await usersService.getKyc(user.id);
  res.json({ kyc: serialize.kyc(kyc) });
}));

router.get('/users/:id/presence', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  res.json({ presence: serialize.presence(user) });
}));

// Unified activity for the CRM timeline (platform-side events).
router.get('/users/:id/activity', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const { rows } = await db.query(
    `select event, data, created_at from activity_log where user_id = $1
     order by created_at desc limit 100`, [user.id]
  );
  res.json({ activity: rows });
}));

// --- Conversion: create OR link a platform user from a CRM lead ----------
const createSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  crm_lead_id: z.string().min(1),
  source: z.string().default('crm'),
  source_campaign: z.string().optional(),
  send_activation_email: z.boolean().default(true),
  // Optional: admin sets the password directly so the client can log in right
  // away (phone onboarding). Stored only as a bcrypt hash, never plaintext.
  password: z.string().min(8).optional(),
  require_password_change: z.boolean().default(true),
});

// POST /users  — idempotent-ish: if the email exists, returns a conflict with
// the existing user so the CRM can offer "link instead".
router.post('/users', asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid user payload', parsed.error.flatten());
  const d = parsed.data;

  const existing = await usersService.findByEmail(d.email);
  if (existing) {
    throw conflict('A platform user with this email already exists', {
      user: serialize.publicUser(existing),
      hint: 'Use POST /users/:id/link to link this lead to the existing user.',
    });
  }

  // Two onboarding modes:
  //  (a) password supplied  -> account is ACTIVE immediately; the client can log
  //      in with the credentials the rep gives them (forced change by default).
  //  (b) no password        -> account is PENDING; an activation link lets the
  //      client choose their own password.
  const withPassword = Boolean(d.password);
  const activation_token = withPassword ? null : randomToken();
  const password_hash = withPassword ? await hashPassword(d.password) : null;

  const user = await db.one(
    `insert into users (email, first_name, last_name, phone, country, status,
                        password_hash, must_change_password, activated_at,
                        activation_token, activation_sent_at, crm_lead_id, source, source_campaign)
     values ($1,$2,$3,$4,$5, $6::user_status, $7, $8,
             case when $6::text = 'active' then now() else null end,
             -- $9 is cast explicitly: it appears both as an insert value and
             -- inside a CASE, and Postgres cannot infer its type from that pair.
             $9::text, case when $9::text is null then null else now() end,
             $10,$11,$12) returning *`,
    [
      d.email, d.first_name, d.last_name, d.phone, d.country,
      withPassword ? 'active' : 'pending',
      password_hash,
      withPassword ? d.require_password_change : false,
      activation_token, d.crm_lead_id, d.source, d.source_campaign,
    ]
  );
  await db.query(`insert into accounts (user_id, type, currency, balance) values ($1,'spot',$2,0)`,
    [user.id, config.defaultCurrency]);
  await db.query(`insert into kyc_records (user_id, level, status) values ($1,0,'none') on conflict do nothing`, [user.id]);
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'account_created',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', crm_lead_id: d.crm_lead_id })]);

  // Activation email only applies to the pending/no-password flow.
  const activationUrl = activation_token
    ? `${config.frontendBaseUrl}/activate.html?token=${activation_token}`
    : null;
  let emailResult = { delivered: false };
  if (activationUrl && d.send_activation_email) {
    emailResult = await sendMail(activationEmail(user, activationUrl));
  }

  webhooks.emit('user.created', { user_id: user.id, email: user.email, crm_lead_id: d.crm_lead_id });

  res.status(201).json({
    user: serialize.publicUser(user),
    login_url: `${config.frontendBaseUrl}/login.html`,
    activation_url: activationUrl,        // null when a password was set directly
    activation_email: emailResult,
  });
}));

// POST /users/:id/set-password — admin sets or resets a user's password.
// The plaintext is hashed immediately and never stored or logged.
const setPasswordSchema = z.object({
  password: z.string().min(8),
  require_password_change: z.boolean().default(true),
});
router.post('/users/:id/set-password', asyncHandler(async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid password payload', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');

  const password_hash = await hashPassword(parsed.data.password);
  const updated = await db.one(
    `update users set password_hash = $2,
                      must_change_password = $3,
                      activation_token = null,
                      status = case when status = 'pending' then 'active'::user_status else status end,
                      activated_at = coalesce(activated_at, now())
     where id = $1 returning *`,
    [user.id, password_hash, parsed.data.require_password_change]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'password_set',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', forced_change: parsed.data.require_password_change })]);
  webhooks.emit('user.password_set', { user_id: user.id });

  res.json({ user: serialize.publicUser(updated), login_url: `${config.frontendBaseUrl}/login.html` });
}));

// POST /users/:id/link  — link an existing platform user to a CRM lead.
router.post('/users/:id/link', asyncHandler(async (req, res) => {
  const crm_lead_id = String(req.body?.crm_lead_id || '');
  if (!crm_lead_id) throw badRequest('crm_lead_id is required');
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');

  const updated = await db.one(
    `update users set crm_lead_id = $2 where id = $1 returning *`, [user.id, crm_lead_id]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'crm_linked',$2::jsonb)`,
    [user.id, JSON.stringify({ crm_lead_id })]);
  res.json({ user: serialize.publicUser(updated) });
}));

// POST /users/:id/send-activation — (re)send the activation email.
router.post('/users/:id/send-activation', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  if (user.status !== 'pending') throw badRequest('User is already activated');

  const token = user.activation_token || randomToken();
  await db.query('update users set activation_token = $2, activation_sent_at = now() where id = $1', [user.id, token]);
  const url = `${config.frontendBaseUrl}/activate.html?token=${token}`;
  const result = await sendMail(activationEmail(user, url));
  res.json({ sent: true, activation_url: url, email: result });
}));

// POST /users/:id/status — authorized admin action (restrict/suspend/activate).
const statusSchema = z.object({
  status: z.enum(['active', 'restricted', 'suspended', 'closed']),
  reason: z.string().optional(),
});
router.post('/users/:id/status', asyncHandler(async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid status', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');

  const updated = await db.one('update users set status = $2 where id = $1 returning *', [user.id, parsed.data.status]);
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'status_changed',$2::jsonb)`,
    [user.id, JSON.stringify({ from: user.status, to: parsed.data.status, reason: parsed.data.reason || null, via: 'crm' })]);
  webhooks.emit('user.status_changed', { user_id: user.id, status: parsed.data.status });
  res.json({ user: serialize.publicUser(updated) });
}));

// PATCH /users/:id — edit profile / email (admin action from the CRM).
const profileSchema = z.object({
  first_name: z.string().max(120).optional(),
  last_name: z.string().max(120).optional(),
  phone: z.string().max(50).optional(),
  country: z.string().max(80).optional(),
  email: z.string().email().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid profile update', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const d = parsed.data;

  // Enforce email uniqueness on change.
  if (d.email && d.email.toLowerCase() !== user.email.toLowerCase()) {
    const clash = await usersService.findByEmail(d.email);
    if (clash) throw conflict('Another user already uses this email');
  }

  // coalesce keeps existing values for fields not supplied.
  const updated = await db.one(
    `update users set
        first_name = coalesce($2, first_name),
        last_name  = coalesce($3, last_name),
        phone      = coalesce($4, phone),
        country    = coalesce($5, country),
        email      = coalesce($6, email)
     where id = $1 returning *`,
    [user.id, d.first_name ?? null, d.last_name ?? null, d.phone ?? null, d.country ?? null, d.email ?? null]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'profile_updated',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', fields: Object.keys(d) })]);
  webhooks.emit('user.updated', { user_id: user.id, fields: Object.keys(d) });
  res.json({ user: serialize.publicUser(updated) });
}));

// POST /users/:id/kyc — admin override of KYC level/status (CRM).
const kycOverrideSchema = z.object({
  level: z.number().int().min(0).max(3),
  status: z.enum(['none', 'pending', 'verified', 'rejected']),
  reviewer_note: z.string().max(500).optional(),
});
router.post('/users/:id/kyc', asyncHandler(async (req, res) => {
  const parsed = kycOverrideSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid KYC override', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const { level, status, reviewer_note } = parsed.data;

  const kyc = await db.one(
    `insert into kyc_records (user_id, level, status, reviewer_note, reviewed_at, submitted_at)
     values ($1,$2,$3,$4, now(), coalesce((select submitted_at from kyc_records where user_id=$1), now()))
     on conflict (user_id) do update set
        level = excluded.level, status = excluded.status,
        reviewer_note = excluded.reviewer_note, reviewed_at = now()
     returning *`,
    [user.id, level, status, reviewer_note ?? null]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'kyc_override',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', level, status })]);
  webhooks.emit('kyc.updated', { user_id: user.id, level, status });
  res.json({ kyc: serialize.kyc(kyc) });
}));

// POST /users/:id/balance — credit or debit a wallet (CRM admin action).
// Transactional: updates the balance AND records an 'adjustment' transaction so
// there is always an auditable money trail. Rejects debits beyond available.
const balanceSchema = z.object({
  account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
  amount: z.number().positive(),
  direction: z.enum(['credit', 'debit']),
  currency: z.string().default(config.defaultCurrency),
  reason: z.string().max(500).optional(),
});
router.post('/users/:id/balance', asyncHandler(async (req, res) => {
  const parsed = balanceSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid balance adjustment', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const { account_type, amount, direction, currency, reason } = parsed.data;
  const delta = direction === 'credit' ? amount : -amount;

  const result = await db.withTransaction(async (client) => {
    // Lock the account row to make concurrent adjustments safe.
    let { rows } = await client.query(
      `select * from accounts where user_id=$1 and type=$2 and currency=$3 for update`,
      [user.id, account_type, currency]
    );
    let account = rows[0];
    if (!account) {
      if (direction === 'debit') throw badRequest('No such account to debit');
      ({ rows } = await client.query(
        `insert into accounts (user_id, type, currency, balance) values ($1,$2,$3,0) returning *`,
        [user.id, account_type, currency]
      ));
      account = rows[0];
    }
    const newBalance = Number(account.balance) + delta;
    if (newBalance < 0) throw badRequest('Debit exceeds available balance');

    const upd = await client.query(
      `update accounts set balance=$2, updated_at=now() where id=$1 returning *`,
      [account.id, newBalance]
    );
    const txn = await client.query(
      `insert into transactions (user_id, type, status, asset, amount, currency, method, note, completed_at, metadata)
       values ($1,'adjustment','completed',$2,$3,$4,'crm_adjustment',$5, now(), $6::jsonb) returning *`,
      [user.id, currency, amount, currency, reason ?? null, JSON.stringify({ direction, account_type, via: 'crm' })]
    );
    return { account: upd.rows[0], txn: txn.rows[0] };
  });

  await db.query(`insert into activity_log (user_id, event, data) values ($1,'balance_adjusted',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', account_type, amount, direction, reason: reason ?? null })]);
  webhooks.emit('transaction.created', {
    user_id: user.id, type: 'adjustment', amount, currency, direction, status: 'completed', id: result.txn.id,
  });

  res.json({ account: serialize.account(result.account), transaction: serialize.transaction(result.txn) });
}));

// POST /users/:id/set-balance — set a wallet to an exact value (CRM admin).
const setBalanceSchema = z.object({
  account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
  target: z.number().min(0),
  currency: z.string().default(config.defaultCurrency),
  reason: z.string().max(500).optional(),
});
router.post('/users/:id/set-balance', asyncHandler(async (req, res) => {
  const parsed = setBalanceSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid set-balance', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const { account_type, target, currency, reason } = parsed.data;

  const result = await db.withTransaction(async (client) => {
    let { rows } = await client.query(
      `select * from accounts where user_id=$1 and type=$2 and currency=$3 for update`,
      [user.id, account_type, currency]
    );
    let account = rows[0];
    if (!account) {
      ({ rows } = await client.query(
        `insert into accounts (user_id, type, currency, balance) values ($1,$2,$3,0) returning *`,
        [user.id, account_type, currency]
      ));
      account = rows[0];
    }
    const oldBalance = Number(account.balance);
    const delta = target - oldBalance;
    if (delta === 0) return { account, txn: null };

    const upd = await client.query(
      `update accounts set balance=$2, updated_at=now() where id=$1 returning *`,
      [account.id, target]
    );
    const direction = delta > 0 ? 'credit' : 'debit';
    const txn = await client.query(
      `insert into transactions (user_id, type, status, asset, amount, currency, method, note, completed_at, metadata)
       values ($1,'adjustment','completed',$2,$3,$4,'crm_set_balance',$5, now(), $6::jsonb) returning *`,
      [user.id, currency, Math.abs(delta), currency, reason ?? `Set balance to ${target}`,
       JSON.stringify({ direction, account_type, via: 'crm', old_balance: oldBalance, new_balance: target })]
    );
    return { account: upd.rows[0], txn: txn.rows[0] };
  });

  await db.query(`insert into activity_log (user_id, event, data) values ($1,'balance_set',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', account_type, target, reason: reason ?? null })]);
  if (result.txn) {
    webhooks.emit('balance.updated', {
      user_id: user.id, account_id: result.account.id,
      balance: Number(result.account.balance), currency,
    });
  }

  res.json({ account: serialize.account(result.account), transaction: result.txn ? serialize.transaction(result.txn) : null });
}));

// ===========================================================================
// FULL ADMIN CONTROL SURFACE
//
// Everything below exists so the CRM can operate the platform end to end.
// Same rules as above: authorized by CRM_API_KEY, written through the
// platform's own logic, recorded in activity_log, and webhooked to the CRM.
// ===========================================================================

// --- Transactions: create / edit / reverse / delete ------------------------

// GET /users/:id/transactions is already defined above (read-only list).

const txnCreateSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'trade', 'fee', 'adjustment']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('completed'),
  amount: z.number().positive(),
  currency: z.string().default(config.defaultCurrency),
  asset: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
  // Move the account balance to match. Off by default so an admin can record a
  // historical entry without silently changing what the customer can withdraw.
  apply_to_balance: z.boolean().default(false),
  account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
});

router.post('/users/:id/transactions', asyncHandler(async (req, res) => {
  const parsed = txnCreateSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid transaction', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const d = parsed.data;

  const out = await db.withTransaction(async (client) => {
    const txn = await client.query(
      `insert into transactions (user_id, type, status, asset, amount, currency, method, reference, note, completed_at, metadata)
       values ($1,$2::txn_type,$3::txn_status,$4,$5,$6,$7,$8,$9,
               case when $3::text = 'completed' then now() else null end, $10::jsonb)
       returning *`,
      [user.id, d.type, d.status, d.asset ?? d.currency, d.amount, d.currency,
       d.method ?? 'crm_manual', d.reference ?? null, d.note ?? null, JSON.stringify({ via: 'crm' })]
    );

    if (!d.apply_to_balance) return { txn: txn.rows[0], account: null };

    // Deposits/adjustments credit; withdrawals/fees debit.
    const sign = d.type === 'withdrawal' || d.type === 'fee' ? -1 : 1;
    let { rows } = await client.query(
      `select * from accounts where user_id=$1 and type=$2 and currency=$3 for update`,
      [user.id, d.account_type, d.currency]
    );
    let account = rows[0];
    if (!account) {
      ({ rows } = await client.query(
        `insert into accounts (user_id, type, currency, balance) values ($1,$2,$3,0) returning *`,
        [user.id, d.account_type, d.currency]
      ));
      account = rows[0];
    }
    const next = Number(account.balance) + sign * d.amount;
    if (next < 0) throw badRequest('Transaction would take the balance negative');
    const upd = await client.query(
      `update accounts set balance=$2, updated_at=now() where id=$1 returning *`, [account.id, next]
    );
    return { txn: txn.rows[0], account: upd.rows[0] };
  });

  await db.query(`insert into activity_log (user_id, event, data) values ($1,'transaction_created',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', type: d.type, amount: d.amount, applied: d.apply_to_balance })]);
  webhooks.emit('transaction.created', {
    user_id: user.id, type: d.type, amount: d.amount, currency: d.currency, status: d.status, id: out.txn.id,
  });

  res.status(201).json({
    transaction: serialize.transaction(out.txn),
    account: out.account ? serialize.account(out.account) : null,
  });
}));

const txnPatchSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  note: z.string().optional(),
  reference: z.string().optional(),
  admin_redirect: z.enum(['history', 'checkout']).optional(),
});

router.patch('/transactions/:txnId', asyncHandler(async (req, res) => {
  const parsed = txnPatchSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid transaction patch', parsed.error.flatten());
  const d = parsed.data;
  if (!Object.keys(d).length) throw badRequest('Nothing to update');

  // Settling a transaction is what moves the money. A customer deposit is
  // created as `pending`; the balance must only change when an admin marks it
  // `completed` here — and must unwind if it is later moved back out of
  // `completed`. Done in one DB transaction with the rows locked so a double
  // click cannot credit twice.
  const out = await db.withTransaction(async (client) => {
    const { rows: before } = await client.query(
      'select * from transactions where id=$1 for update', [req.params.txnId]
    );
    const orig = before[0];
    if (!orig) throw notFound('Transaction not found');

    const { rows: after } = await client.query(
      `update transactions set
         status         = coalesce($2::txn_status, status),
         note           = coalesce($3::text, note),
         reference      = coalesce($4::text, reference),
         admin_redirect = coalesce($5::text, admin_redirect),
         completed_at   = case when $2::text = 'completed' then coalesce(completed_at, now()) else completed_at end
       where id = $1 returning *`,
      [req.params.txnId, d.status ?? null, d.note ?? null, d.reference ?? null, d.admin_redirect ?? null]
    );
    const updated = after[0];

    const wasSettled = orig.status === 'completed';
    const nowSettled = updated.status === 'completed';
    if (wasSettled === nowSettled) return { txn: updated, account: null };

    // Deposits/adjustments credit; withdrawals/fees debit. Undo on un-settle.
    const sign = (orig.type === 'withdrawal' || orig.type === 'fee' ? -1 : 1) * (nowSettled ? 1 : -1);

    let { rows: accs } = await client.query(
      `select * from accounts where user_id=$1 and currency=$2
       order by (type='spot') desc limit 1 for update`,
      [orig.user_id, orig.currency]
    );
    let account = accs[0];
    if (!account) {
      ({ rows: accs } = await client.query(
        `insert into accounts (user_id, type, currency, balance) values ($1,'spot',$2,0) returning *`,
        [orig.user_id, orig.currency]
      ));
      account = accs[0];
    }

    const next = Number(account.balance) + sign * Number(orig.amount);
    if (next < 0) throw badRequest('That status change would take the balance negative');
    const { rows: upd } = await client.query(
      'update accounts set balance=$2, updated_at=now() where id=$1 returning *', [account.id, next]
    );
    return { txn: updated, account: upd[0] };
  });

  const updated = out.txn;
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'transaction_updated',$2::jsonb)`,
    [updated.user_id, JSON.stringify({
      via: 'crm', transaction_id: updated.id, status: d.status,
      balance_applied: Boolean(out.account),
    })]);
  webhooks.emit('transaction.updated', { user_id: updated.user_id, id: updated.id, status: updated.status });
  if (out.account) {
    webhooks.emit('balance.updated', {
      user_id: updated.user_id, account_id: out.account.id,
      balance: Number(out.account.balance), currency: out.account.currency,
    });
  }

  res.json({
    transaction: serialize.transaction(updated),
    account: out.account ? serialize.account(out.account) : null,
  });
}));

// Reverse rather than delete: the original entry stays, a mirror entry undoes
// the balance. Deleting money movements would destroy the audit trail.
router.post('/transactions/:txnId/reverse', asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : null;

  const out = await db.withTransaction(async (client) => {
    const { rows } = await client.query('select * from transactions where id=$1 for update', [req.params.txnId]);
    const orig = rows[0];
    if (!orig) throw notFound('Transaction not found');
    if (orig.status === 'cancelled') throw conflict('Transaction is already reversed');

    const sign = orig.type === 'withdrawal' || orig.type === 'fee' ? 1 : -1;
    const { rows: accs } = await client.query(
      `select * from accounts where user_id=$1 and currency=$2 order by (type='spot') desc limit 1 for update`,
      [orig.user_id, orig.currency]
    );
    const account = accs[0];
    if (account) {
      const next = Number(account.balance) + sign * Number(orig.amount);
      if (next < 0) throw badRequest('Reversal would take the balance negative');
      await client.query('update accounts set balance=$2, updated_at=now() where id=$1', [account.id, next]);
    }

    const cancelled = await client.query(
      `update transactions set status='cancelled' where id=$1 returning *`, [orig.id]
    );
    const mirror = await client.query(
      `insert into transactions (user_id, type, status, asset, amount, currency, method, note, completed_at, metadata)
       values ($1,'adjustment','completed',$2,$3,$4,'crm_reversal',$5, now(), $6::jsonb) returning *`,
      [orig.user_id, orig.asset, orig.amount, orig.currency,
       reason ?? `Reversal of ${orig.id}`, JSON.stringify({ via: 'crm', reverses: orig.id })]
    );
    return { orig: cancelled.rows[0], mirror: mirror.rows[0] };
  });

  await db.query(`insert into activity_log (user_id, event, data) values ($1,'transaction_reversed',$2::jsonb)`,
    [out.orig.user_id, JSON.stringify({ via: 'crm', transaction_id: out.orig.id, reason })]);
  webhooks.emit('transaction.reversed', { user_id: out.orig.user_id, id: out.orig.id });

  res.json({ reversed: serialize.transaction(out.orig), adjustment: serialize.transaction(out.mirror) });
}));

// --- Positions -------------------------------------------------------------

const positionSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['long', 'short']).default('long'),
  size: z.number().positive(),
  entry_price: z.number().positive(),
  mark_price: z.number().positive().optional(),
});

router.post('/users/:id/positions', asyncHandler(async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid position', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const d = parsed.data;

  const p = await db.one(
    `insert into positions (user_id, symbol, side, size, entry_price, mark_price, pnl, status)
     values ($1,$2,$3,$4,$5,$6,0,'open') returning *`,
    [user.id, d.symbol, d.side, d.size, d.entry_price, d.mark_price ?? d.entry_price]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'position_opened',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', symbol: d.symbol, size: d.size })]);
  res.status(201).json({ position: serialize.position(p) });
}));

router.post('/positions/:posId/close', asyncHandler(async (req, res) => {
  const pnl = Number(req.body?.pnl);
  const p = await db.one(
    `update positions set status='closed', closed_at=now(), pnl=coalesce($2, pnl)
     where id=$1 returning *`,
    [req.params.posId, Number.isFinite(pnl) ? pnl : null]
  );
  if (!p) throw notFound('Position not found');

  await db.query(`insert into activity_log (user_id, event, data) values ($1,'position_closed',$2::jsonb)`,
    [p.user_id, JSON.stringify({ via: 'crm', position_id: p.id, pnl: Number(p.pnl) })]);
  res.json({ position: serialize.position(p) });
}));

// --- Account lifecycle -----------------------------------------------------

// Close (soft): status -> 'closed' and the session is invalidated. Reversible.
router.post('/users/:id/close', asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : null;
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');

  const updated = await db.one(
    `update users set status='closed', activation_token=null where id=$1 returning *`, [user.id]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'account_closed',$2::jsonb)`,
    [user.id, JSON.stringify({ via: 'crm', reason })]);
  webhooks.emit('user.closed', { user_id: user.id, reason });
  res.json({ user: serialize.publicUser(updated) });
}));

// Hard delete. Cascades to accounts/transactions/positions/kyc/activity — it is
// irreversible, so it demands an explicit confirmation of the account's email.
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const confirm = req.query.confirm_email || req.body?.confirm_email;
  if (String(confirm || '').toLowerCase() !== String(user.email).toLowerCase()) {
    throw badRequest('confirm_email must match the account email to delete it');
  }

  await db.query('delete from users where id=$1', [user.id]);
  await db.query(`insert into activity_log (user_id, event, data) values (null,'account_deleted',$1::jsonb)`,
    [JSON.stringify({ via: 'crm', deleted_user_id: user.id, email: user.email })]);
  webhooks.emit('user.deleted', { user_id: user.id, email: user.email });
  res.json({ deleted: true, id: user.id });
}));

// --- Payment methods -------------------------------------------------------

router.get('/users/:id/payment-methods', asyncHandler(async (req, res) => {
  const rows = await db.query(
    'select * from payment_methods where user_id=$1 order by is_default desc, created_at desc', [req.params.id]
  );
  res.json({ payment_methods: rows.rows.map(serialize.paymentMethod) });
}));

const methodSchema = z.object({
  kind: z.enum(['card', 'bank', 'crypto']),
  label: z.string().min(1),
  masked: z.string().min(1),
  holder: z.string().optional(),
  detail: z.string().optional(),
  is_default: z.boolean().default(false),
  verified: z.boolean().default(false),
});

router.post('/users/:id/payment-methods', asyncHandler(async (req, res) => {
  const parsed = methodSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid payment method', parsed.error.flatten());
  const d = parsed.data;
  const m = await db.one(
    `insert into payment_methods (user_id, kind, label, masked, holder, detail, is_default, verified)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [req.params.id, d.kind, d.label, d.masked, d.holder ?? null, d.detail ?? null, d.is_default, d.verified]
  );
  res.status(201).json({ payment_method: serialize.paymentMethod(m) });
}));

router.delete('/payment-methods/:methodId', asyncHandler(async (req, res) => {
  await db.query('delete from payment_methods where id=$1', [req.params.methodId]);
  res.json({ deleted: true, id: req.params.methodId });
}));

// --- ProTrader Bot ---------------------------------------------------------

async function readBot(userId) {
  const { rows } = await db.query('select * from bot_configs where user_id=$1', [userId]);
  return serialize.botConfig(rows[0], userId);
}

router.get('/users/:id/bot', asyncHandler(async (req, res) => {
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const { rows: events } = await db.query(
    'select * from bot_events where user_id=$1 order by created_at desc limit 20', [user.id]
  );
  res.json({ bot: await readBot(user.id), events: events.map(serialize.botEvent) });
}));

const botSchema = z.object({
  status: z.enum(['stopped', 'running', 'paused', 'locked']).optional(),
  strategy: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  symbols: z.array(z.string().min(1)).optional(),
  max_position_size: z.number().min(0).optional(),
  daily_loss_limit: z.number().min(0).optional(),
  take_profit_pct: z.number().min(0).max(100).optional(),
  stop_loss_pct: z.number().min(0).max(100).optional(),
  leverage: z.number().int().min(1).max(125).optional(),
  enabled_by_admin: z.boolean().optional(),
  admin_note: z.string().optional(),
  actor: z.string().optional(),
});

router.patch('/users/:id/bot', asyncHandler(async (req, res) => {
  const parsed = botSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid bot config', parsed.error.flatten());
  const user = await usersService.findById(req.params.id);
  if (!user) throw notFound('User not found');
  const d = parsed.data;
  const actor = d.actor || 'crm';

  // The admin kill-switch wins: disabling it stops a running bot immediately.
  const status = d.enabled_by_admin === false ? 'locked' : d.status ?? null;

  const bot = await db.one(
    `insert into bot_configs as b (user_id, status, strategy, symbols, max_position_size,
        daily_loss_limit, take_profit_pct, stop_loss_pct, leverage, enabled_by_admin, admin_note, updated_by)
     values ($1, coalesce($2::bot_status,'stopped'), coalesce($3,'balanced'),
             coalesce($4::text[], array['BTC/USDT']), coalesce($5,0), coalesce($6,0),
             coalesce($7,2.00), coalesce($8,1.00), coalesce($9,1), coalesce($10,true), $11, $12)
     on conflict (user_id) do update set
       status            = coalesce($2::bot_status, b.status),
       strategy          = coalesce($3, b.strategy),
       symbols           = coalesce($4::text[], b.symbols),
       max_position_size = coalesce($5, b.max_position_size),
       daily_loss_limit  = coalesce($6, b.daily_loss_limit),
       take_profit_pct   = coalesce($7, b.take_profit_pct),
       stop_loss_pct     = coalesce($8, b.stop_loss_pct),
       leverage          = coalesce($9, b.leverage),
       enabled_by_admin  = coalesce($10, b.enabled_by_admin),
       admin_note        = coalesce($11, b.admin_note),
       updated_by        = $12
     returning *`,
    [user.id, status, d.strategy ?? null, d.symbols ?? null,
     d.max_position_size ?? null, d.daily_loss_limit ?? null, d.take_profit_pct ?? null,
     d.stop_loss_pct ?? null, d.leverage ?? null, d.enabled_by_admin ?? null, d.admin_note ?? null, actor]
  );

  await db.query(
    `insert into bot_events (user_id, event, actor, data) values ($1,$2,$3,$4::jsonb)`,
    [user.id, d.status ? 'status_changed' : 'config_changed', actor, JSON.stringify(d)]
  );
  webhooks.emit('bot.updated', { user_id: user.id, status: bot.status, actor });

  res.json({ bot: serialize.botConfig(bot, user.id) });
}));

module.exports = router;
