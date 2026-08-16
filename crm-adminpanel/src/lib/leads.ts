import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Promote a client to investor when a deposit is confirmed.
 *
 * This is the real conversion event: someone stops being a prospect the moment
 * money actually lands, not when a rep clicks a button. Only fires on a deposit
 * reaching 'completed', which requires an admin to confirm it.
 *
 * Idempotent — a second confirmed deposit must not rewrite the date on which
 * they first became an investor.
 */
export async function promoteToInvestorOnDeposit(platformUserId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: lead } = await admin
    .from('leads')
    .select('id, status, converted_at')
    .eq('platform_user_id', platformUserId)
    .maybeSingle();

  // No CRM record (e.g. the account was created directly on the platform), or
  // already converted — nothing to do either way.
  if (!lead || lead.status === 'converted') return false;

  await admin
    .from('leads')
    .update({ status: 'converted', converted_at: lead.converted_at ?? new Date().toISOString() })
    .eq('id', lead.id);

  await recordLeadHistory(lead.id, null, 'converted', {
    reason: 'deposit_confirmed',
    platform_user_id: platformUserId,
  });

  return true;
}

// Record an entry in a lead's history timeline. Uses the service role so the
// timeline is always complete, but always attributes the acting admin.
export async function recordLeadHistory(
  leadId: string,
  actorId: string | null,
  type: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('lead_history').insert({
      lead_id: leadId,
      actor_id: actorId,
      type,
      data,
    });
  } catch (e) {
    console.error('[leads] failed to record history:', (e as Error).message);
  }
}
