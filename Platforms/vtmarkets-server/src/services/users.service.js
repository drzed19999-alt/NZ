'use strict';

const db = require('../db');
const config = require('../config');

async function findByEmail(email) {
  return db.one('select * from users where lower(email) = lower($1)', [email]);
}

async function findById(id) {
  return db.one('select * from users where id = $1', [id]);
}

async function getBalances(userId) {
  const { rows } = await db.query(
    'select * from accounts where user_id = $1 order by type',
    [userId]
  );
  return rows;
}

async function getTransactions(userId, { limit = 50, type } = {}) {
  const params = [userId];
  let sql = 'select * from transactions where user_id = $1';
  if (type) {
    params.push(type);
    sql += ` and type = $${params.length}`;
  }
  params.push(Math.min(limit, 200));
  sql += ` order by created_at desc limit $${params.length}`;
  const { rows } = await db.query(sql, params);
  return rows;
}

async function getPositions(userId, { status = 'open' } = {}) {
  const { rows } = await db.query(
    'select * from positions where user_id = $1 and status = $2 order by opened_at desc',
    [userId, status]
  );
  return rows;
}

async function getKyc(userId) {
  return db.one('select * from kyc_records where user_id = $1', [userId]);
}

/** Aggregated totals used by the CRM investor snapshot. */
async function getFinancialSummary(userId) {
  const balances = await getBalances(userId);
  const totalBalance = balances.reduce((s, a) => s + Number(a.balance), 0);

  const agg = await db.one(
    `select
        coalesce(sum(amount) filter (where type='deposit'    and status='completed'),0) as total_deposited,
        coalesce(sum(amount) filter (where type='withdrawal' and status='completed'),0) as total_withdrawn
     from transactions where user_id = $1`,
    [userId]
  );

  return {
    total_balance: totalBalance,
    total_deposited: Number(agg.total_deposited),
    total_withdrawn: Number(agg.total_withdrawn),
    currency: balances[0]?.currency || config.defaultCurrency,
  };
}

module.exports = {
  findByEmail,
  findById,
  getBalances,
  getTransactions,
  getPositions,
  getKyc,
  getFinancialSummary,
};
