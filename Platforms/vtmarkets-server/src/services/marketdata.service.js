'use strict';

// ---------------------------------------------------------------------------
// Market data for the non-crypto instruments.
//
// Crypto comes straight from Binance in the browser: free, unlimited, genuinely
// live. Everything else — forex, metals, shares, ETFs — comes from Twelve Data,
// whose free plan allows 8 credits/minute and 800/day, at ONE CREDIT PER SYMBOL.
// Batching saves round-trips, not quota.
//
// That budget does not allow a live board. With ~42 instruments a full sweep
// costs ~42 credits, so roughly 14 sweeps a day is the ceiling. Quotes are
// therefore fetched on a slow rotation, cached in the database, and served to
// every visitor from there — and the API reports how old they are so the UI can
// say so rather than implying they are live.
//
// The key is server-side only. Putting it in the static frontend would expose it
// in page source and let each visitor's browser spend the shared daily budget.
// ---------------------------------------------------------------------------

const db = require('../db');
const config = require('../config');

const BASE = 'https://api.twelvedata.com';

// Upstream per-minute cap. A sweep is chunked to stay under it.
const MAX_SYMBOLS_PER_REQUEST = 8;

// How stale a quote may get before it is refreshed. ~1.7h keeps ~42 symbols
// inside the 800/day budget with headroom.
const TTL_MS = 100 * 60 * 1000;

// Our display symbol -> the provider's symbol.
//
// Indices (SPX, DJI, ...) and crude (WTI, BRENT) return 403 on the free plan and
// are deliberately absent: better no row than a fabricated one.
const SYMBOL_MAP = {
  // Forex
  'EUR / USD': 'EUR/USD', 'GBP / USD': 'GBP/USD', 'USD / JPY': 'USD/JPY',
  'AUD / USD': 'AUD/USD', 'USD / CAD': 'USD/CAD', 'EUR / GBP': 'EUR/GBP',
  'NZD / USD': 'NZD/USD', 'USD / CHF': 'USD/CHF', 'EUR / JPY': 'EUR/JPY',
  'GBP / JPY': 'GBP/JPY', 'AUD / CAD': 'AUD/CAD', 'EUR / AUD': 'EUR/AUD',
  'EUR / CAD': 'EUR/CAD', 'GBP / AUD': 'GBP/AUD', 'CHF / JPY': 'CHF/JPY',
  'CAD / JPY': 'CAD/JPY',
  // Metals
  'XAU / USD': 'XAU/USD', 'XAG / USD': 'XAG/USD', 'XPT / USD': 'XPT/USD',
  'XPD / USD': 'XPD/USD', 'XCU / USD': 'XCU/USD',
  // Shares
  NVDA: 'NVDA', AAPL: 'AAPL', TSLA: 'TSLA', AMZN: 'AMZN', MSFT: 'MSFT',
  META: 'META', GOOG: 'GOOG', AMD: 'AMD', NFLX: 'NFLX', COIN: 'COIN',
  JPM: 'JPM', V: 'V',
  // ETFs
  SPY: 'SPY', QQQ: 'QQQ', GLD: 'GLD', IWM: 'IWM', EEM: 'EEM',
  ARKK: 'ARKK', DIA: 'DIA', SLV: 'SLV',
  // Energy (only natural gas is served on the free plan)
  NGAS: 'NG',
};

function configured() {
  return Boolean(config.marketData && config.marketData.apiKey);
}

async function fetchChunk(providerSymbols) {
  const url = `${BASE}/quote?symbol=${encodeURIComponent(providerSymbols.join(','))}`
    + `&apikey=${encodeURIComponent(config.marketData.apiKey)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`upstream http ${res.status}`);
  const body = await res.json();

  // A single symbol returns a bare object; several return a map keyed by symbol.
  return providerSymbols.length === 1 ? { [providerSymbols[0]]: body } : body;
}

async function persist(ourSymbol, providerSymbol, quote) {
  const failed = !quote || quote.status === 'error' || quote.code;
  await db.query(
    `insert into market_quotes (symbol, provider_symbol, price, change, percent_change, fetched_at, error)
     values ($1,$2,$3,$4,$5, now(), $6)
     on conflict (symbol) do update set
       provider_symbol = excluded.provider_symbol,
       price           = coalesce(excluded.price, market_quotes.price),
       change          = coalesce(excluded.change, market_quotes.change),
       percent_change  = coalesce(excluded.percent_change, market_quotes.percent_change),
       fetched_at      = excluded.fetched_at,
       error           = excluded.error`,
    [
      ourSymbol,
      providerSymbol,
      failed ? null : Number(quote.close ?? quote.price) || null,
      failed ? null : Number(quote.change) || null,
      failed ? null : Number(quote.percent_change) || null,
      failed ? String(quote.message || 'unavailable').slice(0, 300) : null,
    ]
  );
}

/**
 * Refresh whichever quotes are stale, up to one chunk per call.
 *
 * Deliberately does ONE chunk: a request that triggered a full sweep would both
 * breach the per-minute cap and make that visitor wait on ~6 upstream round
 * trips. Successive calls walk through the rest.
 */
async function refreshStale() {
  if (!configured()) return { refreshed: 0, skipped: 'not configured' };

  const cutoff = new Date(Date.now() - TTL_MS).toISOString();
  const known = Object.keys(SYMBOL_MAP);

  const { rows } = await db.query(
    `select symbol from market_quotes where fetched_at > $1`,
    [cutoff]
  );
  const fresh = new Set(rows.map((r) => r.symbol));
  const stale = known.filter((s) => !fresh.has(s)).slice(0, MAX_SYMBOLS_PER_REQUEST);
  if (!stale.length) return { refreshed: 0 };

  const providerSymbols = stale.map((s) => SYMBOL_MAP[s]);
  try {
    const data = await fetchChunk(providerSymbols);
    for (const ourSymbol of stale) {
      await persist(ourSymbol, SYMBOL_MAP[ourSymbol], data[SYMBOL_MAP[ourSymbol]]);
    }
    return { refreshed: stale.length };
  } catch (e) {
    // Stamp the attempt so a hard upstream failure does not spin: these symbols
    // will not be retried until they age out again.
    for (const ourSymbol of stale) {
      await persist(ourSymbol, SYMBOL_MAP[ourSymbol], { status: 'error', message: e.message });
    }
    return { refreshed: 0, error: e.message };
  }
}

/** Everything we hold, with its age so callers can be honest about staleness. */
async function getQuotes() {
  const { rows } = await db.query(
    `select symbol, price, change, percent_change, fetched_at, error from market_quotes`
  );

  const quotes = {};
  let oldest = null;
  for (const r of rows) {
    if (r.price === null) continue;
    quotes[r.symbol] = {
      price: Number(r.price),
      change: r.change === null ? null : Number(r.change),
      percent_change: r.percent_change === null ? null : Number(r.percent_change),
      as_of: r.fetched_at,
    };
    if (!oldest || new Date(r.fetched_at) < new Date(oldest)) oldest = r.fetched_at;
  }

  return {
    quotes,
    as_of: oldest,
    // Named so the client cannot mistake this for a streaming feed.
    delayed: true,
    refresh_interval_minutes: Math.round(TTL_MS / 60000),
    configured: configured(),
    covered: Object.keys(SYMBOL_MAP).length,
  };
}

module.exports = { getQuotes, refreshStale, SYMBOL_MAP, TTL_MS };
