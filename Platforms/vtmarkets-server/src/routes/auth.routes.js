'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('../db');
const config = require('../config');
const usersService = require('../services/users.service');
const { hashPassword, verifyPassword, randomToken } = require('../auth/password');
const { signUserToken } = require('../auth/jwt');
const { requireUser } = require('../auth/middleware');
const { asyncHandler, badRequest, unauthorized, conflict } = require('../lib/http');
const serialize = require('../lib/serializers');
const webhooks = require('../lib/webhooks');
const { sendMail, activationEmail } = require('../lib/mailer');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

// Self-service registration (creates an active user).
router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid registration', parsed.error.flatten());
  const { email, password, first_name, last_name, country, phone } = parsed.data;

  const existing = await usersService.findByEmail(email);
  if (existing) throw conflict('An account with this email already exists');

  const password_hash = await hashPassword(password);
  const user = await db.one(
    `insert into users (email, password_hash, first_name, last_name, country, phone, status, activated_at, source)
     values ($1,$2,$3,$4,$5,$6,'active', now(), 'organic') returning *`,
    [email, password_hash, first_name, last_name, country, phone]
  );

  // Seed a spot wallet + empty KYC record.
  await db.query(`insert into accounts (user_id, type, currency, balance) values ($1,'spot',$2,0)`,
    [user.id, config.defaultCurrency]);
  await db.query(`insert into kyc_records (user_id, level, status) values ($1,0,'none') on conflict do nothing`, [user.id]);

  const token = signUserToken(user);
  res.status(201).json({ token, user: serialize.publicUser(user) });
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Real login: verifies bcrypt hash, issues a JWT, records presence + webhook.
router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Email and password are required');
  const { email, password } = parsed.data;

  const user = await usersService.findByEmail(email);
  if (!user || !user.password_hash) throw unauthorized('Invalid email or password');
  if (user.status === 'pending') throw unauthorized('Account not activated yet');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw unauthorized('Invalid email or password');

  await db.query('update users set last_login_at = now(), last_active_at = now() where id = $1', [user.id]);
  await db.query(
    `insert into activity_log (user_id, event, ip, user_agent) values ($1,'login',$2,$3)`,
    [user.id, req.ip, req.headers['user-agent'] || null]
  );
  webhooks.emit('user.login', { user_id: user.id, email: user.email, at: new Date().toISOString() });

  const token = signUserToken(user);
  res.json({ token, user: serialize.publicUser(user) });
}));

const activateSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

// Activation: set password from an activation token (from the account-opening email).
router.post('/activate', asyncHandler(async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest('Invalid activation payload', parsed.error.flatten());
  const { token, password } = parsed.data;

  const user = await db.one('select * from users where activation_token = $1', [token]);
  if (!user) throw badRequest('Activation link is invalid or has expired');

  const password_hash = await hashPassword(password);
  const updated = await db.one(
    `update users set password_hash = $2, status = 'active', activated_at = now(),
                      activation_token = null
     where id = $1 returning *`,
    [user.id, password_hash]
  );
  webhooks.emit('user.activated', { user_id: updated.id, email: updated.email });

  const jwtToken = signUserToken(updated);
  res.json({ token: jwtToken, user: serialize.publicUser(updated) });
}));

// Current user (customer session).
router.get('/me', requireUser, asyncHandler(async (req, res) => {
  res.json({ user: serialize.publicUser(req.user) });
}));

router.post('/logout', requireUser, asyncHandler(async (req, res) => {
  await db.query(`insert into activity_log (user_id, event) values ($1,'logout')`, [req.user.id]);
  res.json({ ok: true });
}));

// Resend / trigger the activation email (used by the frontend "resend" button).
router.post('/resend-activation', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '');
  const user = await usersService.findByEmail(email);
  // Always respond ok to avoid account enumeration.
  if (user && user.status === 'pending') {
    const token = user.activation_token || randomToken();
    await db.query('update users set activation_token = $2, activation_sent_at = now() where id = $1', [user.id, token]);
    const url = `${config.frontendBaseUrl}/activate.html?token=${token}`;
    await sendMail(activationEmail(user, url));
  }
  res.json({ ok: true });
}));

module.exports = router;
