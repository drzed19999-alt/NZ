// Role-based permission matrix. Enforced SERVER-SIDE (route handlers + server
// actions) and mirrored by RLS in the database. The frontend also uses `can()`
// to hide controls, but that is UX only — never the security boundary.

export type Role = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';

export type Permission =
  | 'lead.read'
  | 'lead.write'
  | 'lead.delete'
  | 'lead.assign'
  | 'lead.convert'
  | 'email.send'
  | 'investor.read'
  | 'investor.action'      // suspend/restrict/status changes on the platform
  | 'investor.edit'        // edit profile/email and KYC on the platform
  | 'investor.funds'       // credit/debit a user's balance (most sensitive)
  | 'investor.txn'         // create / edit / reverse transactions
  | 'investor.position'    // open and close trading positions
  | 'investor.bot'         // configure and lock the ProTrader Bot
  | 'investor.delete'      // close or permanently delete a platform account
  | 'admin.manage'         // manage CRM admins & roles
  | 'audit.read'
  | 'settings.manage';

const MATRIX: Record<Role, Permission[]> = {
  owner: [
    'lead.read', 'lead.write', 'lead.delete', 'lead.assign', 'lead.convert',
    'email.send', 'investor.read', 'investor.action', 'investor.edit', 'investor.funds',
    'investor.txn', 'investor.position', 'investor.bot', 'investor.delete',
    'admin.manage', 'audit.read', 'settings.manage',
  ],
  admin: [
    'lead.read', 'lead.write', 'lead.delete', 'lead.assign', 'lead.convert',
    'email.send', 'investor.read', 'investor.action', 'investor.edit', 'investor.funds',
    'investor.txn', 'investor.position', 'investor.bot',
    'admin.manage', 'audit.read', 'settings.manage',
  ],
  manager: [
    'lead.read', 'lead.write', 'lead.assign', 'lead.convert',
    'email.send', 'investor.read', 'audit.read',
  ],
  agent: [
    'lead.read', 'lead.write', 'lead.convert', 'email.send', 'investor.read',
  ],
  viewer: [
    'lead.read', 'investor.read',
  ],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}

export const ROLES: Role[] = ['owner', 'admin', 'manager', 'agent', 'viewer'];
