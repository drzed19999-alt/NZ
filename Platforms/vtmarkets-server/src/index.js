'use strict';

// Local / long-running entry point. The Express app itself lives in app.js so
// that a serverless host (see api/index.js) can import it without a port ever
// being bound — calling app.listen() at import time breaks on Vercel.

const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`[vtmarkets-api] listening on http://localhost:${config.port} (${config.env})`);
  if (!config.integration.apiKey) console.warn('[vtmarkets-api] CRM_API_KEY not set — integration API will reject all requests.');
  if (!config.webhooks.url) console.warn('[vtmarkets-api] CRM_WEBHOOK_URL not set — outbound webhooks disabled.');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));

module.exports = app;
