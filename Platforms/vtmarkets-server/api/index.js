'use strict';

// Vercel serverless entry point. Vercel invokes this per request and never
// wants a listening socket, so it exports the bare Express app.
//
// Two things behave differently here than on a long-running server:
//
//  * express-rate-limit's default store is in-process. Each serverless instance
//    keeps its own counters, so limits are per-instance, not global. Treat it as
//    best-effort and put a shared store (Redis) or the platform WAF in front of
//    /api/auth before relying on it.
//  * pg pools do not survive between invocations. DATABASE_URL must point at a
//    pooler in transaction mode (Supabase port 6543), not a direct connection.

module.exports = require('../src/app');
