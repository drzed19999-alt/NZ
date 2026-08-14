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

const server = app.listen(config.port, () => {
  console.log(`[vtmarkets-api] listening on http://localhost:${config.port} (${config.env})`);
  if (!config.integration.apiKey) console.warn('[vtmarkets-api] CRM_API_KEY not set — integration API will reject all requests.');
  if (!config.webhooks.url) console.warn('[vtmarkets-api] CRM_WEBHOOK_URL not set — outbound webhooks disabled.');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));

module.exports = app;
