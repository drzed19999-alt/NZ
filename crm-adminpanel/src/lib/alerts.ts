import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSetting } from '@/lib/settings';

// ============================================================================
// Alerts engine. Creates flagged alerts from platform webhook events and from
// snapshot evaluation. Thresholds are configurable via env.
// ============================================================================

type AlertType = 'large_deposit' | 'large_withdrawal' | 'dormant' | 'kyc_sla' | 'suspicious';

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
  await admin.from('alerts').insert({
    type: input.type,
    severity: input.severity ?? 'warning',
    platform_user_id: input.platform_user_id ?? null,
    lead_id: input.lead_id ?? null,
    title: input.title,
    data: input.data ?? {},
  });
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
      title: `Large deposit: ${evt.amount.toLocaleString()} ${evt.currency ?? 'USD'}`,
      data: evt,
    });
  } else if (evt.type === 'withdrawal') {
    await createAlert({
      type: 'large_withdrawal',
      severity: 'critical',
      platform_user_id: evt.user_id,
      title: `Large withdrawal: ${evt.amount.toLocaleString()} ${evt.currency ?? 'USD'}`,
      data: evt,
    });
  }
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
