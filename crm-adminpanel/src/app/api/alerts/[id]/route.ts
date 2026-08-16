import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleError, ok, getIp } from '@/lib/http';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PATCH /api/alerts/:id — acknowledge (or un-acknowledge) an alert.
//
// The alerts table has carried `acknowledged` and `acknowledged_by` since the
// beginning and nothing ever set them: the dashboard filtered on
// acknowledged=false and the stats tile counted the same, so the feed only ever
// grew and "Open alerts" could never come down.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const acknowledged = body?.acknowledged !== false; // default: acknowledge

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('alerts')
      .update({
        acknowledged,
        acknowledged_by: acknowledged ? actor.id : null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    await audit(actor, acknowledged ? 'alert.acknowledge' : 'alert.reopen', {
      entityType: 'alert',
      entityId: params.id,
      data: { type: data?.type },
      ip: getIp(req),
    });

    return ok({ alert: data });
  } catch (e) {
    return handleError(e);
  }
}
