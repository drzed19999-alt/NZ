'use strict';

// Applies db/schema.sql to the configured database.
// Usage: npm run migrate

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`[migrate] applying ${schemaPath} ...`);
  await pool.query(sql);
  console.log('[migrate] done.');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
