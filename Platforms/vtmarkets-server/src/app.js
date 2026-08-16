'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { ApiError } = require('./lib/http');

const authRoutes = require('./routes/auth.routes');
const meRoutes = require('./routes/me.routes');
const integrationRoutes = require('./routes/integration.routes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// CORS: the browser frontend only; the integration API is called server-to-server.
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl (no origin) and configured origins
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// --- Rate limiting -------------------------------------------------------
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 50, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });
const integrationLimiter = rateLimit({ windowMs: 60_000, max: 600, standardHeaders: true, legacyHeaders: false });

// --- Health --------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true, service: 'vtmarkets-api', ts: Date.now() }));

// --- Deployment diagnostics ----------------------------------------------
// A misconfigured deploy surfaces as an opaque 500 or 403, and the only way to
// tell the causes apart is to read the host's logs. This reports which settings
// arrived and whether the database actually answers.
//
// It deliberately exposes NO secret values: booleans for whether a variable is
// set, plus the CORS origin list and DB host, which are not sensitive.
app.get('/health/config', async (_req, res) => {
  const present = (name) => Boolean(process.env[name]);

  let dbHost = null;
  let dbPort = null;
  try {
    const u = new URL(config.db.url);
    dbHost = u.hostname;
    dbPort = u.port;
  } catch (e) { /* leave null — malformed or absent */ }

  const result = {
    service: 'vtmarkets-api',
    env: config.env,
    env_vars_present: {
      DATABASE_URL: present('DATABASE_URL'),
      JWT_SECRET: present('JWT_SECRET'),
      CRM_API_KEY: present('CRM_API_KEY'),
      CRM_WEBHOOK_SECRET: present('CRM_WEBHOOK_SECRET'),
      CRM_WEBHOOK_URL: present('CRM_WEBHOOK_URL'),
      CORS_ORIGINS: present('CORS_ORIGINS'),
    },
    cors: {
      // Exactly what an Origin header is compared against. If your frontend
      // origin is not in this list character-for-character, it gets a 403.
      allowed_origins: config.corsOrigins,
      allows_any: config.corsOrigins.length === 0,
    },
    database: {
      host: dbHost,
      port: dbPort,
      // 6543 is Supabase's transaction pooler; 5432 is session mode and will
      // exhaust connections on a serverless host.
      pooler_mode: dbPort === '6543' ? 'transaction (correct for serverless)'
        : dbPort === '5432' ? 'session (wrong for serverless)' : 'unknown',
      ssl: config.db.ssl,
      connected: null,
      error: null,
    },
  };

  try {
    const db = require('./db');
    await db.query('select 1');
    result.database.connected = true;
  } catch (e) {
    result.database.connected = false;
    result.database.error = e.message;
  }

  res.status(result.database.connected ? 200 : 503).json(result);
});

// --- Root ----------------------------------------------------------------
// This is an API-only service; the browser frontend is served separately. Hitting
// the root in a browser used to return a bare not_found, which reads like the
// service is broken. Name the service and point at the real entry points instead.
app.get('/', (_req, res) =>
  res.json({
    service: 'vtmarkets-api',
    status: 'ok',
    message: 'API only — the web frontend is served separately.',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      me: '/api/me',
      integration: '/api/integration/v1',
    },
  })
);

// --- Routes --------------------------------------------------------------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/me', apiLimiter, meRoutes);
app.use('/api/integration/v1', integrationLimiter, integrationRoutes);

// --- 404 -----------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
});

// --- Error handler -------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: { code: 'cors', message: err.message } });
  }
  console.error('[error]', err);
  res.status(500).json({ error: { code: 'internal', message: 'Internal server error' } });
});

module.exports = app;
