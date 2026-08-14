import { requirePermission } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleError, ok, err, getIp } from '@/lib/http';
import { updateAdminSchema } from '@/lib/validation';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// PATCH /api/admins/:id — change role / active / name (owner/admin only)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requirePermission('admin.manage');
    const patch = updateAdminSchema.parse(await req.json());

    // Guard: don't let an admin lock themselves out or demote the last owner.
    if (params.id === actor.id && patch.active === false) {
      return err(400, 'self_lock', 'You cannot deactivate your own account');
    }
    const adminDb = createAdminClient();

    if (patch.role || patch.active === false) {
      const { count } = await adminDb
        .from('crm_admins')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner')
        .eq('active', true);
      const { data: target } = await adminDb.from('crm_admins').select('role, active').eq('id', params.id).single();
      const demotingLastOwner =
        target?.role === 'owner' &&
        (count ?? 0) <= 1 &&
        (patch.active === false || (patch.role && patch.role !== 'owner'));
      if (demotingLastOwner) return err(400, 'last_owner', 'Cannot remove the last active owner');
    }

    const { data: admin, error } = await adminDb
      .from('crm_admins')
      .update(patch)
      .eq('id', params.id)
      .select('id, email, full_name, role, active, created_at')
      .single();
    if (error) throw error;

    await audit(actor, 'admin.update', { entityType: 'crm_admin', entityId: params.id, data: patch, ip: getIp(req) });
    return ok({ admin });
  } catch (e) {
    return handleError(e);
  }
}
