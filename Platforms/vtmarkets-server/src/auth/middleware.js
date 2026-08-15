'use strict';

const crypto = require('crypto');
const { verifyToken } = require('./jwt');
const config = require('../config');
const db = require('../db');
const { unauthorized, forbidden, asyncHandler } = require('../lib/http');

/**
 * Customer auth: requires a valid user JWT (Bearer). Also refreshes the
 * user's presence signal (last_active_at) so "online now" is real, DB-backed
 * data rather than a fabricated indicator.
 */
const requireUser = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized('Missing bearer token');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const user = await db.one('select * from users where id = $1', [payload.sub]);
  if (!user) throw unauthorized('User no longer exists');
  if (user.status === 'suspended' || user.status === 'closed') {
    throw forbidden('Account is not active');
  }

  // Presence: fire-and-forget so it never slows the request.
  db.query('update users set last_active_at = now() where id = $1', [user.id]).catch(() => {});

  req.user = user;
  next();
});

/**
 * CRM integration auth: constant-time comparison against the shared API key.
 * Accepts either `Authorization: Bearer <key>` or `X-API-Key: <key>`.
 */
function requireApiKey(req, _res, next) {
  const configured = config.integration.apiKey;
  if (!configured) return next(forbidden('Integration API key is not configured on the server'));

  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const provided = bearer || req.headers['x-api-key'] || '';

  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(configured));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return next(unauthorized('Invalid integration API key'));

  next();
}

module.exports = { requireUser, requireApiKey };
