import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
