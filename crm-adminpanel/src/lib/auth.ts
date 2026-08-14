import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { can, type Permission, type Role } from '@/lib/rbac';

export interface CurrentAdmin {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  active: boolean;
}

/** Resolve the signed-in CRM admin (or null). */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from('crm_admins')
    .select('id, email, full_name, role, active')
    .eq('id', user.id)
    .single();

  if (!admin || !admin.active) return null;
  return admin as CurrentAdmin;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Require an authenticated, active admin. Throws AuthError(401) otherwise. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthError(401, 'Not authenticated');
  return admin;
}

/** Require a specific permission. Throws AuthError(401/403). */
export async function requirePermission(permission: Permission): Promise<CurrentAdmin> {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) {
    throw new AuthError(403, `Missing permission: ${permission}`);
  }
  return admin;
}
