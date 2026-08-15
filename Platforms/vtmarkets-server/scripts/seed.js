'use strict';

// Seeds realistic platform data into the database so the frontend and the CRM
// read REAL rows — not hardcoded markup. Idempotent: safe to re-run.
// Usage: npm run seed

const { pool, withTransaction } = require('../src/db');
const { hashPassword } = require('../src/auth/password');

const DEMO_PASSWORD = 'Password123!'; // demo login password for seeded users

const USERS = [
  {
    email: 'amelie.rousseau@example.com', first_name: 'Amélie', last_name: 'Rousseau',
    country: 'CA', phone: '+1 514 555 0142', status: 'active', source: 'meta',
    source_campaign: 'CA-Crypto-Q3', kyc: { level: 2, status: 'verified' },
    balances: { spot: 195334.60, futures: 117025.40, funding: 33017.00 },
    online_minutes_ago: 2,
  },
  {
    email: 'liam.tremblay@example.com', first_name: 'Liam', last_name: 'Tremblay',
    country: 'CA', phone: '+1 438 555 0199', status: 'active', source: 'meta',
    source_campaign: 'CA-Crypto-Q3', kyc: { level: 1, status: 'pending' },
    balances: { spot: 4200.00, funding: 800.00 },
    online_minutes_ago: 90,
  },
  {
    email: 'sofia.martin@example.com', first_name: 'Sofia', last_name: 'Martin',
    country: 'FR', phone: '+33 6 55 01 23 45', status: 'active', source: 'meta',
    source_campaign: 'FR-Invest-August', kyc: { level: 2, status: 'verified' },
    balances: { spot: 58210.25, futures: 12000.00 },
    online_minutes_ago: 4320, // 3 days
  },
  {
    email: 'noah.lefevre@example.com', first_name: 'Noah', last_name: 'Lefevre',
    country: 'FR', phone: '+33 6 55 09 88 77', status: 'restricted', source: 'organic',
    kyc: { level: 0, status: 'none' },
    balances: { spot: 150.00 },
    online_minutes_ago: 20160, // 14 days -> dormant
  },
  {
    email: 'emma.dubois@example.com', first_name: 'Emma', last_name: 'Dubois',
    country: 'BE', phone: '+32 470 55 01 02', status: 'pending', source: 'meta',
    source_campaign: 'EU-Retarget', kyc: { level: 0, status: 'none' },
    balances: {},
    online_minutes_ago: null, // never logged in
  },
];

const TXNS = {
  'amelie.rousseau@example.com': [
    { type: 'deposit', amount: 50000, method: 'bank', status: 'completed', daysAgo: 40 },
    { type: 'deposit', amount: 120000, method: 'crypto', status: 'completed', daysAgo: 30 },
    { type: 'withdrawal', amount: 15000, method: 'bank', status: 'completed', daysAgo: 12 },
    { type: 'deposit', amount: 90000, method: 'card', status: 'completed', daysAgo: 3 },
  ],
  'sofia.martin@example.com': [
    { type: 'deposit', amount: 60000, method: 'bank', status: 'completed', daysAgo: 25 },
    { type: 'withdrawal', amount: 2000, method: 'crypto', status: 'pending', daysAgo: 1 },
  ],
  'liam.tremblay@example.com': [
    { type: 'deposit', amount: 5000, method: 'card', status: 'completed', daysAgo: 6 },
  ],
};

const POSITIONS = {
  'amelie.rousseau@example.com': [
    { symbol: 'BTCUSDT', side: 'long', size: 1.5, entry_price: 61250, mark_price: 64300, pnl: 4575 },
    { symbol: 'ETHUSDT', side: 'long', size: 20, entry_price: 3100, mark_price: 3320, pnl: 4400 },
  ],
  'sofia.martin@example.com': [
    { symbol: 'BTCUSDT', side: 'short', size: 0.4, entry_price: 65000, mark_price: 64300, pnl: 280 },
  ],
};

async function seed() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await withTransaction(async (client) => {
    for (const u of USERS) {
      const lastActive =
        u.online_minutes_ago == null
          ? null
          : new Date(Date.now() - u.online_minutes_ago * 60_000);

      const { rows } = await client.query(
        `insert into users (email, password_hash, first_name, last_name, phone, country,
                            status, source, source_campaign, activated_at, last_login_at, last_active_at)
         values ($1,$2,$3,$4,$5,$6,$7::user_status,$8,$9,
                 case when $7::text = 'pending' then null else now() end,
                 $10,$10)
         on conflict (email) do update set
            first_name = excluded.first_name,
            last_name  = excluded.last_name,
            status     = excluded.status,
            last_active_at = excluded.last_active_at
         returning id`,
        [
          u.email, u.status === 'pending' ? null : passwordHash,
          u.first_name, u.last_name, u.phone, u.country, u.status,
          u.source, u.source_campaign || null, lastActive,
        ]
      );
      const userId = rows[0].id;

      // Accounts / balances
      await client.query('delete from accounts where user_id = $1', [userId]);
      for (const [type, balance] of Object.entries(u.balances)) {
        await client.query(
          `insert into accounts (user_id, type, currency, balance) values ($1,$2,'CAD',$3)`,
          [userId, type, balance]
        );
      }

      // KYC
      await client.query(
        `insert into kyc_records (user_id, level, status, submitted_at, reviewed_at)
         values ($1,$2,$3::kyc_status,
                 case when $3::text = 'none' then null else now() - interval '20 days' end,
                 case when $3::text = 'verified' then now() - interval '18 days' else null end)
         on conflict (user_id) do update set level = excluded.level, status = excluded.status`,
        [userId, u.kyc.level, u.kyc.status]
      );

      // Transactions
      await client.query('delete from transactions where user_id = $1', [userId]);
      for (const t of (TXNS[u.email] || [])) {
        await client.query(
          `insert into transactions (user_id, type, status, asset, amount, currency, method, created_at, completed_at)
           values ($1,$2::txn_type,$3::txn_status,'CAD',$4,'CAD',$5, now() - ($6 || ' days')::interval,
                   case when $3::text = 'completed' then now() - ($6 || ' days')::interval else null end)`,
          [userId, t.type, t.status, t.amount, t.method, String(t.daysAgo)]
        );
      }

      // Positions
      await client.query(`delete from positions where user_id = $1`, [userId]);
      for (const p of (POSITIONS[u.email] || [])) {
        await client.query(
          `insert into positions (user_id, symbol, side, size, entry_price, mark_price, pnl, status)
           values ($1,$2,$3,$4,$5,$6,$7,'open')`,
          [userId, p.symbol, p.side, p.size, p.entry_price, p.mark_price, p.pnl]
        );
      }

      // A couple of activity rows for the timeline
      await client.query('delete from activity_log where user_id = $1', [userId]);
      if (lastActive) {
        await client.query(
          `insert into activity_log (user_id, event, created_at) values ($1,'login',$2)`,
          [userId, lastActive]
        );
      }
    }
  });

  console.log(`[seed] seeded ${USERS.length} users. Demo password for active users: ${DEMO_PASSWORD}`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
