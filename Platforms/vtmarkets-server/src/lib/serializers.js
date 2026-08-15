'use strict';

const config = require('../config');

function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  const ms = config.presence.onlineWindowMinutes * 60_000;
  return Date.now() - new Date(lastActiveAt).getTime() <= ms;
}

/** Human-friendly presence, honestly derived from last_active_at. */
function presence(user) {
  return {
    online: isOnline(user.last_active_at),
    last_active_at: user.last_active_at,
    last_login_at: user.last_login_at,
    // We do NOT claim realtime websocket presence — this is a last-active signal.
    signal: 'last_active',
    window_minutes: config.presence.onlineWindowMinutes,
  };
}

/** Public user shape (never leak password_hash / activation_token). */
function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    full_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
    phone: u.phone,
    country: u.country,
    status: u.status,
    role: u.role,
    source: u.source,
    source_campaign: u.source_campaign,
    crm_lead_id: u.crm_lead_id,
    activated_at: u.activated_at,
    must_change_password: u.must_change_password === true,
    created_at: u.created_at,
  };
}

function account(a) {
  return {
    id: a.id,
    type: a.type,
    currency: a.currency,
    balance: Number(a.balance),
    updated_at: a.updated_at,
  };
}

function transaction(t) {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    asset: t.asset,
    amount: Number(t.amount),
    currency: t.currency,
    method: t.method,
    reference: t.reference,
    note: t.note,
    checkout_details: t.checkout_details || null,
    admin_redirect: t.admin_redirect || null,
    created_at: t.created_at,
    completed_at: t.completed_at,
  };
}

function position(p) {
  return {
    id: p.id,
    symbol: p.symbol,
    side: p.side,
    size: Number(p.size),
    entry_price: Number(p.entry_price),
    mark_price: p.mark_price == null ? null : Number(p.mark_price),
    pnl: Number(p.pnl),
    status: p.status,
    opened_at: p.opened_at,
  };
}

function kyc(k) {
  if (!k) return { level: 0, status: 'none' };
  return {
    level: k.level,
    status: k.status,
    submitted_at: k.submitted_at,
    reviewed_at: k.reviewed_at,
    reviewer_note: k.reviewer_note,
  };
}

/** ProTrader Bot configuration. Defaults mirror the table defaults so a user
 *  with no row yet reads back the same shape as one who has been configured. */
function botConfig(b, userId) {
  if (!b) {
    return {
      user_id: userId, status: 'stopped', strategy: 'balanced', symbols: ['BTC/USDT'],
      max_position_size: 0, daily_loss_limit: 0, take_profit_pct: 2, stop_loss_pct: 1,
      leverage: 1, enabled_by_admin: true, admin_note: null, updated_by: null, updated_at: null,
    };
  }
  return {
    user_id: b.user_id,
    status: b.status,
    strategy: b.strategy,
    symbols: b.symbols || [],
    max_position_size: Number(b.max_position_size),
    daily_loss_limit: Number(b.daily_loss_limit),
    take_profit_pct: Number(b.take_profit_pct),
    stop_loss_pct: Number(b.stop_loss_pct),
    leverage: Number(b.leverage),
    enabled_by_admin: b.enabled_by_admin === true,
    admin_note: b.admin_note,
    updated_by: b.updated_by,
    updated_at: b.updated_at,
  };
}

function botEvent(e) {
  return { id: e.id, event: e.event, actor: e.actor, data: e.data, created_at: e.created_at };
}

function paymentMethod(m) {
  return {
    id: m.id, kind: m.kind, label: m.label, masked: m.masked, holder: m.holder,
    detail: m.detail, is_default: m.is_default === true, verified: m.verified === true,
    created_at: m.created_at,
  };
}

module.exports = {
  isOnline, presence, publicUser, account, transaction, position, kyc,
  botConfig, botEvent, paymentMethod,
};
