'use strict';

const { Pool } = require('pg');
const config = require('./config');

// A single shared connection pool. Works against any Postgres, including
// Supabase (set DATABASE_SSL=true).
const pool = new Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error', err);
});

/** Run a parameterized query. */
async function query(text, params) {
  return pool.query(text, params);
}

/** Convenience: return the first row or null. */
async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

/** Run a set of statements inside a transaction. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, one, withTransaction };
