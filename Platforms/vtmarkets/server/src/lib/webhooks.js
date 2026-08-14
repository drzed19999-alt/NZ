'use strict';

const crypto = require('crypto');
const config = require('../config');
const db = require('../db');

/**
 * Push a platform event to the CRM. Payloads are HMAC-signed with a shared
 * secret so the CRM can verify authenticity (X-VT-Signature: sha256=...).
 *
 * This is the PUSH side of the "live dashboard": deposits, withdrawals,
 * logins, and KYC changes are delivered to the CRM the moment they happen,
 * rather than the CRM polling for them.
 *
 * Fire-and-forget: never blocks or fails the originating request.
 */
async function dispatch(event, data) {
  const url = config.webhooks.url;
  if (!url) return; // webhooks disabled

  const body = JSON.stringify({
    event,
    data,
    sent_at: new Date().toISOString(),
    id: crypto.randomUUID(),
  });

  const signature = config.webhooks.secret
    ? 'sha256=' + crypto.createHmac('sha256', config.webhooks.secret).update(body).digest('hex')
    : '';

  let deliveryId = null;
  try {
    const row = await db.one(
      `insert into webhook_deliveries (event, target_url, payload, attempts)
       values ($1, $2, $3::jsonb, 1) returning id`,
      [event, url, body]
    );
    deliveryId = row?.id;
  } catch (e) {
    console.error('[webhooks] failed to record delivery', e.message);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VT-Event': event,
        'X-VT-Signature': signature,
      },
      body,
      // Node 18+ global fetch
    });
    if (deliveryId) {
      await db.query(
        `update webhook_deliveries
           set status_code = $2, ok = $3, delivered_at = now()
         where id = $1`,
        [deliveryId, res.status, res.ok]
      );
    }
  } catch (e) {
    console.error(`[webhooks] delivery failed for ${event}:`, e.message);
    if (deliveryId) {
      await db.query('update webhook_deliveries set error = $2 where id = $1', [deliveryId, e.message]).catch(() => {});
    }
  }
}

// Fire without awaiting from route handlers.
function emit(event, data) {
  dispatch(event, data).catch(() => {});
}

module.exports = { dispatch, emit };
