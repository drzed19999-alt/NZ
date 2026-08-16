import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSetting } from '@/lib/settings';

// ============================================================================
// Alerts engine. Creates flagged alerts from platform webhook events and from
// snapshot evaluation. Thresholds are configurable via env.
// ============================================================================

type AlertType =
  | 'large_deposit' | 'large_withdrawal' | 'dormant' | 'kyc_sla' | 'suspicious'
  | 'checkout_waiting' | 'deposit_settled' | 'transaction_failed' | 'transaction_reversed'
  | 'lead_converted';

interface CreateAlertInput {
  type: AlertType;
  severity?: 'info' | 'warning' | 'critical';
  platform_user_id?: string | null;
  lead_id?: string | null;
  title: string;
  data?: Record<string, unknown>;
}

export async function createAlert(input: CreateAlertInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('alerts').insert({
    type: input.type,
    severity: input.severity ?? 'warning',
    platform_user_id: input.platform_user_id ?? null,
    lead_id: input.lead_id ?? null,
    title: input.title,
    data: input.data ?? {},
  });
  // `alerts.type` is a Postgres enum. A value the database does not know about
  // yet fails here rather than silently — say which migration is missing instead
  // of letting the webhook look like it worked.
  if (error) {
    console.error(
      `[alerts] could not create "${input.type}" alert: ${error.message}. `
      + `If this is an unknown enum value, run: alter type alert_type add value if not exists '${input.type}';`
    );
  }
}

/**
 * Evaluate a transaction event for large-deposit / large-withdrawal alerts.
 * Called from the platform webhook receiver.
 */
export async function evaluateTransactionEvent(evt: {
  user_id: string;
  type: string;
  amount: number;
  currency?: string;
}): Promise<void> {
  const threshold = await getSetting<number>('alert.large_txn_threshold');
  if (evt.amount < threshold) return;

  if (evt.type === 'deposit') {
    await createAlert({
      type: 'large_deposit',
      severity: 'warning',
      platform_user_id: evt.user_id,
      title: `Large deposit: ${evt.amount.toLocaleString()} ${evt.currency ?? 'CAD'}`,
      data: evt,
    });
  } else if (evt.type === 'withdrawal') {
    await createAlert({
      type: 'large_withdrawal',
      severity: 'critical',
      platform_user_id: evt.user_id,
      title: `Large withdrawal: ${evt.amount.toLocaleString()} ${evt.currency ?? 'CAD'}`,
      data: evt,
    });
  }
}

/**
 * A card deposit lands `pending` and the customer is held on the checkout
 * processing screen until an admin redirects them. Amount is irrelevant here —
 * any held deposit is a real person waiting — so this ignores the large-txn
 * threshold and fires every time.
 *
 * Returns true when the customer is actually being held (i.e. an admin needs to
 * act), so the caller can decide whether to auto-release them.
 */
export async function evaluateCheckoutWaiting(evt: {
  user_id: string;
  type: string;
  status?: string;
  method?: string;
  amount: number;
  currency?: string;
  id?: string;
}): Promise<boolean> {
  const held =
    evt.type === 'deposit' && evt.status === 'pending' && evt.method === 'card';
  if (!held) return false;

  await createAlert({
    type: 'checkout_waiting',
    severity: 'critical',
    platform_user_id: evt.user_id,
    title: `Customer waiting at checkout: ${evt.amount.toLocaleString()} ${evt.currency ?? 'CAD'}`,
    data: evt,
  });
  return true;
}

/**
 * A transaction changing state is the event a desk actually waits on. The CRM
 * previously only alerted when one was *created*, so you were told money had
 * been attempted and never that it arrived, failed or was clawed back.
 *
 * Amount is irrelevant to whether these matter, so unlike the large_* rules
 * these fire on every transaction.
 */
export async function evaluateTransactionUpdated(evt: {
  user_id: string;
  type: string;
  status: string;
  amount: number;
  currency?: string;
  id?: string;
}): Promise<void> {
  const money = `${Number(evt.amount).toLocaleString()} ${evt.currency ?? 'CAD'}`;
  const noun = evt.type === 'deposit' ? 'Deposit' : evt.type === 'withdrawal' ? 'Withdrawal' : 'Transaction';

  if (evt.status === 'completed') {
    await createAlert({
      type: 'deposit_settled',
      severity: 'info',
      platform_user_id: evt.user_id,
      title: `${noun} settled: ${money}`,
      data: evt,
    });
    return;
  }

  if (evt.status === 'failed' || evt.status === 'cancelled') {
    await createAlert({
      type: 'transaction_failed',
      // A failed withdrawal is a customer who cannot get their money out — that
      // needs someone to look, not a passive info badge.
      severity: evt.type === 'withdrawal' ? 'critical' : 'warning',
      platform_user_id: evt.user_id,
      title: `${noun} ${evt.status}: ${money}`,
      data: evt,
    });
  }
}

/** A reversal moves money back out of an account — always worth surfacing. */
export async function evaluateTransactionReversed(evt: {
  user_id: string;
  type?: string;
  amount: number;
  currency?: string;
  id?: string;
}): Promise<void> {
  await createAlert({
    type: 'transaction_reversed',
    severity: 'critical',
    platform_user_id: evt.user_id,
    title: `Transaction reversed: ${Number(evt.amount).toLocaleString()} ${evt.currency ?? 'CAD'}`,
    data: evt,
  });
}

export async function evaluateKycEvent(evt: { user_id: string; status: string; level?: number }): Promise<void> {
  if (evt.status === 'pending') {
    const slaHours = await getSetting<number>('alert.kyc_sla_hours');
    await createAlert({
      type: 'kyc_sla',
      severity: 'info',
      platform_user_id: evt.user_id,
      title: `KYC submitted (level ${evt.level ?? '?'}) — SLA ${slaHours}h`,
      data: evt,
    });
  }
}
