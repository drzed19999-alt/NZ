import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CurrentAdmin } from '@/lib/auth';

// Append-only audit trail. Uses the service role so an entry is always written
// regardless of the caller's RLS, and can never be updated/deleted by clients.
export async function audit(
  actor: CurrentAdmin | null,
  action: string,
  opts: {
    entityType?: string;
    entityId?: string;
    data?: Record<string, unknown>;
    ip?: string | null;
  } = {}
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      data: opts.data ?? {},
      ip: opts.ip ?? null,
    });
  } catch (e) {
    // Never let audit failures break the primary action, but do log them.
    console.error('[audit] failed to write log:', (e as Error).message);
  }
}
