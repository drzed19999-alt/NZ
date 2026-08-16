'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const usersService = require('../services/users.service');
const { requireUser } = require('../auth/middleware');
const { hashPassword, verifyPassword, randomToken, sha256 } = require('../auth/password');
const { asyncHandler, badRequest, unauthorized, notFound } = require('../lib/http');
const serialize = require('../lib/serializers');
const webhooks = require('../lib/webhooks');

const router = express.Router();

// Everything here requires a customer session.
router.use(requireUser);

router.get('/balances', asyncHandler(async (req, res) => {
  const accounts = await usersService.getBalances(req.user.id);
  const summary = await usersService.getFinancialSummary(req.user.id);
  res.json({ accounts: accounts.map(serialize.account), summary });
}));

router.get('/transactions', asyncHandler(async (req, res) => {
  const rows = await usersService.getTransactions(req.user.id, {
    limit: parseInt(req.query.limit || '50', 10),
    type: req.query.type,
  });
  res.json({ transactions: rows.map(serialize.transaction) });
}));

router.get('/positions', asyncHandler(async (req, res) => {
  const rows = await usersService.getPositions(req.user.id, { status: req.query.status || 'open' });
  res.json({ positions: rows.map(serialize.position) });
}));

router.get('/kyc', asyncHandler(async (req, res) => {
  const kyc = await usersService.getKyc(req.user.id);
  res.json({ kyc: serialize.kyc(kyc) });
}));

// --- Customer actions ---------------------------------------------------

const depositSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['card', 'crypto', 'bank']).default('card'),
  currency: z.string().default(config.defaultCurrency),
  checkout_details: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    card_last4: z.string().max(4).optional(),
    card_brand: z.string().optional(),
    cardholder: z.string().optional(),
    billing_address: z.string().optional(),
    billing_city: z.string().optional(),
    billing_region: z.string().optional(),
    billing_country: z.string().optional(),
    billing_postal: z.string().optional(),
  }).optional(),
});

router.post('/deposit', asyncHandler(async (req, res) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid deposit', parsed.error.flatten());
  const { amount, method, currency, checkout_details } = parsed.data;

  const txn = await db.one(
    `insert into transactions (user_id, type, status, amount, currency, method, checkout_details)
     values ($1,'deposit','pending',$2,$3,$4,$5::jsonb) returning *`,
    [req.user.id, amount, currency, method, checkout_details ? JSON.stringify(checkout_details) : null]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'deposit',$2::jsonb)`,
    [req.user.id, JSON.stringify({ amount, method })]);
  webhooks.emit('transaction.created', {
    user_id: req.user.id, type: 'deposit', amount, currency, method, status: 'pending', id: txn.id,
  });

  res.status(201).json({ transaction: serialize.transaction(txn) });
}));

// Poll a pending transaction for an admin redirect command.
router.get('/transactions/:txnId/poll', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'select id, status, admin_redirect from transactions where id=$1 and user_id=$2',
    [req.params.txnId, req.user.id]
  );
  if (!rows[0]) throw require('../lib/http').notFound('Transaction not found');
  const t = rows[0];
  res.json({ status: t.status, admin_redirect: t.admin_redirect || null });
}));

const withdrawSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['crypto', 'bank']).default('bank'),
  currency: z.string().default(config.defaultCurrency),
  destination: z.string().optional(),
});

router.post('/withdraw', asyncHandler(async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid withdrawal', parsed.error.flatten());
  const { amount, method, currency, destination } = parsed.data;

  const summary = await usersService.getFinancialSummary(req.user.id);
  if (amount > summary.total_balance) throw badRequest('Amount exceeds available balance');

  const txn = await db.one(
    `insert into transactions (user_id, type, status, amount, currency, method, reference)
     values ($1,'withdrawal','pending',$2,$3,$4,$5) returning *`,
    [req.user.id, amount, currency, method, destination || null]
  );
  await db.query(`insert into activity_log (user_id, event, data) values ($1,'withdrawal',$2::jsonb)`,
    [req.user.id, JSON.stringify({ amount, method })]);
  webhooks.emit('transaction.created', {
    user_id: req.user.id, type: 'withdrawal', amount, currency, method, status: 'pending', id: txn.id,
  });

  res.status(201).json({ transaction: serialize.transaction(txn) });
}));

// Change own password. Required when an admin set a temporary one
// (must_change_password), and usable any time from account settings.
const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

router.post('/change-password', asyncHandler(async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid password change', parsed.error.flatten());
  const { current_password, new_password } = parsed.data;

  const ok = await verifyPassword(current_password, req.user.password_hash);
  if (!ok) throw unauthorized('Current password is incorrect');

  const password_hash = await hashPassword(new_password);
  await db.query(
    'update users set password_hash = $2, must_change_password = false where id = $1',
    [req.user.id, password_hash]
  );
  await db.query(`insert into activity_log (user_id, event) values ($1,'password_changed')`, [req.user.id]);
  res.json({ ok: true });
}));

const kycSchema = z.object({
  level: z.number().int().min(1).max(2).default(1),
});

router.post('/kyc', asyncHandler(async (req, res) => {
  const parsed = kycSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid KYC submission');
  const { level } = parsed.data;

  const kyc = await db.one(
    `insert into kyc_records (user_id, level, status, submitted_at)
     values ($1,$2,'pending', now())
     on conflict (user_id) do update set level = excluded.level, status = 'pending', submitted_at = now()
     returning *`,
    [req.user.id, level]
  );
  webhooks.emit('kyc.updated', { user_id: req.user.id, level, status: 'pending' });
  res.json({ kyc: serialize.kyc(kyc) });
}));

// --- ProTrader Bot (customer side) -----------------------------------------
// The customer can read their config and change their own settings. They can
// NOT touch `enabled_by_admin` — that is the CRM's kill-switch — and if an
// admin has locked the bot, starting it is refused here as well.

router.get('/bot', asyncHandler(async (req, res) => {
  const { rows } = await db.query('select * from bot_configs where user_id=$1', [req.user.id]);
  res.json({ bot: serialize.botConfig(rows[0], req.user.id) });
}));

const myBotSchema = z.object({
  status: z.enum(['stopped', 'running', 'paused']).optional(),
  strategy: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  symbols: z.array(z.string().min(1)).optional(),
  max_position_size: z.number().min(0).optional(),
  take_profit_pct: z.number().min(0).max(100).optional(),
  stop_loss_pct: z.number().min(0).max(100).optional(),
  leverage: z.number().int().min(1).max(125).optional(),
});

router.patch('/bot', asyncHandler(async (req, res) => {
  const parsed = myBotSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid bot settings', parsed.error.flatten());
  const d = parsed.data;

  const { rows: existing } = await db.query('select * from bot_configs where user_id=$1', [req.user.id]);
  const current = existing[0];
  if (current && current.enabled_by_admin === false) {
    throw badRequest('The ProTrader Bot has been disabled for this account. Contact support.');
  }

  const bot = await db.one(
    `insert into bot_configs as b (user_id, status, strategy, symbols, max_position_size,
        take_profit_pct, stop_loss_pct, leverage, updated_by)
     values ($1, coalesce($2::bot_status,'stopped'), coalesce($3,'balanced'),
             coalesce($4::text[], array['BTC/USDT']), coalesce($5,0),
             coalesce($6,2.00), coalesce($7,1.00), coalesce($8,1), 'user')
     on conflict (user_id) do update set
       status            = coalesce($2::bot_status, b.status),
       strategy          = coalesce($3, b.strategy),
       symbols           = coalesce($4::text[], b.symbols),
       max_position_size = coalesce($5, b.max_position_size),
       take_profit_pct   = coalesce($6, b.take_profit_pct),
       stop_loss_pct     = coalesce($7, b.stop_loss_pct),
       leverage          = coalesce($8, b.leverage),
       updated_by        = 'user'
     returning *`,
    [req.user.id, d.status ?? null, d.strategy ?? null, d.symbols ?? null,
     d.max_position_size ?? null, d.take_profit_pct ?? null, d.stop_loss_pct ?? null, d.leverage ?? null]
  );

  await db.query(
    `insert into bot_events (user_id, event, actor, data) values ($1,$2,'user',$3::jsonb)`,
    [req.user.id, d.status ? 'status_changed' : 'config_changed', JSON.stringify(d)]
  );
  webhooks.emit('bot.updated', { user_id: req.user.id, status: bot.status, actor: 'user' });

  res.json({ bot: serialize.botConfig(bot, req.user.id) });
}));

// --- Security activity ------------------------------------------------------
// Real sign-in and account history for the signed-in user. The account page
// used to show two invented "active sessions" with fabricated IPs and cities.
// Auth here is stateless JWT with no session store, so there is nothing to
// revoke per device — what can be shown honestly is what actually happened.
router.get('/activity', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const { rows } = await db.query(
    `select event, ip, user_agent, data, created_at
       from activity_log where user_id = $1
      order by created_at desc limit $2`,
    [req.user.id, limit]
  );
  res.json({ activity: rows });
}));

// --- API keys (customer side) ----------------------------------------------
// The user_api_keys table has existed since the beginning with no routes behind
// it, so the UI shipped two invented keys and a Revoke button that only raised a
// toast. Only the hash is stored: the plaintext key is shown once, at creation,
// and cannot be recovered afterwards.

const apiKeyCreateSchema = z.object({
  label: z.string().min(1).max(60),
});

router.get('/api-keys', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `select id, label, key_prefix, created_at, last_used_at, revoked_at
       from user_api_keys where user_id = $1 order by created_at desc`,
    [req.user.id]
  );
  res.json({ api_keys: rows.map(serialize.apiKey) });
}));

router.post('/api-keys', asyncHandler(async (req, res) => {
  const parsed = apiKeyCreateSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid API key', parsed.error.flatten());

  const active = await db.one(
    `select count(*)::int as n from user_api_keys where user_id = $1 and revoked_at is null`,
    [req.user.id]
  );
  if (active.n >= 10) throw badRequest('You already have 10 active API keys. Revoke one first.');

  // vt_live_<random>. The prefix is stored for display so a user can tell their
  // keys apart in the table without the secret ever being readable again.
  const secret = randomToken(24);
  const full = `vt_live_${secret}`;
  const key = await db.one(
    `insert into user_api_keys (user_id, label, key_prefix, key_hash)
     values ($1,$2,$3,$4) returning *`,
    [req.user.id, parsed.data.label, full.slice(0, 16), sha256(full)]
  );

  await db.query(
    `insert into activity_log (user_id, event, data) values ($1,'api_key_created',$2::jsonb)`,
    [req.user.id, JSON.stringify({ label: parsed.data.label, key_prefix: full.slice(0, 16) })]
  );

  // `key` is returned exactly once and never persisted in plaintext.
  res.status(201).json({ api_key: serialize.apiKey(key), key: full });
}));

router.delete('/api-keys/:keyId', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `update user_api_keys set revoked_at = now()
      where id = $1 and user_id = $2 and revoked_at is null returning *`,
    [req.params.keyId, req.user.id]
  );
  if (!rows[0]) throw notFound('API key not found or already revoked');

  await db.query(
    `insert into activity_log (user_id, event, data) values ($1,'api_key_revoked',$2::jsonb)`,
    [req.user.id, JSON.stringify({ key_prefix: rows[0].key_prefix })]
  );

  res.json({ api_key: serialize.apiKey(rows[0]) });
}));

module.exports = router;
