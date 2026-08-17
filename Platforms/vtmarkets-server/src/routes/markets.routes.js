'use strict';

// Public market data. No session required — these are quotes, not account data,
// and the checkout/marketing pages read them too.

const express = require('express');
const { asyncHandler } = require('../lib/http');
const marketData = require('../services/marketdata.service');

const router = express.Router();

// GET /api/markets/quotes
//
// Serves the cached quotes and, as a side effect, refreshes one chunk of
// whatever has gone stale. Traffic therefore drives the rotation without any
// single request waiting on a full sweep.
router.get('/quotes', asyncHandler(async (_req, res) => {
  // Never let a refresh failure withhold the quotes we already have.
  marketData.refreshStale().catch((e) => console.error('[markets] refresh failed:', e.message));

  const payload = await marketData.getQuotes();

  // Small cache window so a burst of visitors does not each hit the database;
  // far shorter than the refresh interval, so nothing goes stale because of it.
  res.set('Cache-Control', 'public, max-age=30');
  res.json(payload);
}));

module.exports = router;
