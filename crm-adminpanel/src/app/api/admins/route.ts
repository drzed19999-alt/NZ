import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleError, ok, err, getIp } from '@/lib/http';
import { createAdminSchema } from '@/lib/validation';
import { audit } from '@/lib/audit';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/admins — list CRM admins (any member can view roster)
export async function GET() {
  try {
    await requirePermission('lead.read'); // any member
    const supabase = createClient();
    const { data, error } = await supabase
      .from('crm_admins')
      .select('id, email, full_name, role, active, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ok({ admins: data });
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/admins — invite/create a CRM admin (owner/admin only)
export async function POST(req: Request) {
  try {
    const actor = await requirePermission('admin.manage');
    const input = createAdminSchema.parse(await req.json());
    const adminDb = createAdminClient();

    // Create (or find) the auth user via the service role.
    const password = input.password ?? crypto.randomBytes(12).toString('base64url');
    const { data: created, error: createErr } = await adminDb.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });

    let userId = created?.user?.id;
    if (createErr) {
      // If the user already exists, look them up so we can still attach a role.
      const { data: list } = await adminDb.auth.admin.listUsers();
      const found = list?.users?.find((u) => u.email?.toLowerCase() === input.email.toLowerCase());
      if (!found) return err(400, 'auth_error', createErr.message);
      userId = found.id;
    }
    if (!userId) return err(500, 'internal', 'Could not resolve user id');

    const { data: admin, error } = await adminDb
      .from('crm_admins')
      .upsert({ id: userId, email: input.email, full_name: input.full_name, role: input.role, active: true })
      .select('id, email, full_name, role, active, created_at')
      .single();
    if (error) throw error;

    await audit(actor, 'admin.create', {
      entityType: 'crm_admin', entityId: userId,
      data: { email: input.email, role: input.role, temp_password_generated: !input.password }, ip: getIp(req),
    });

    return ok({ admin, temp_password: input.password ? undefined : password }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
