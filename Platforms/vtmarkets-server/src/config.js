'use strict';

// Resolve .env next to the server, not relative to process.cwd() — otherwise the
// app silently boots with no config whenever it is started from another
// directory. On a serverless host there is no .env at all and this is a no-op:
// the environment comes from the platform.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

function required(name) {
  const v = process.env[name];
  if (!v) {
    // Fail fast in production; warn in dev so the app can still boot for wiring.
    const msg = `[config] Missing required env var: ${name}`;
    if (process.env.NODE_ENV === 'production') throw new Error(msg);
    console.warn(msg);
  }
  return v;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  // Fiat currency for account balances and transactions. Crypto pair symbols
  // (BTC/USDT and friends) are unrelated and are never derived from this.
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'CAD',

  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    url: required('DATABASE_URL'),
    ssl: String(process.env.DATABASE_SSL || 'false').toLowerCase() === 'true',
  },

  jwt: {
    secret: required('JWT_SECRET') || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  presence: {
    onlineWindowMinutes: parseInt(process.env.PRESENCE_ONLINE_WINDOW_MINUTES || '5', 10),
  },

  integration: {
    // The single shared key the CRM uses to authenticate. In a larger system
    // this would be a table of hashed keys with scopes; one strong env key is
    // sufficient and secure for a single trusted CRM consumer.
    apiKey: process.env.CRM_API_KEY || '',
  },

  webhooks: {
    url: process.env.CRM_WEBHOOK_URL || '',
    secret: process.env.CRM_WEBHOOK_SECRET || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'VT Markets <no-reply@vtmarkets.example>',
  },

  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5500',
};

module.exports = config;
