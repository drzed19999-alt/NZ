import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { platform, isPlatformConfigured } from '@/lib/crypto-platform/client';

export const dynamic = 'force-dynamic';

// GET /api/directory — everyone in one list, clients and investors together.
//
// The two existing pages each show half the picture: /leads is the CRM's own
// records, /investors is the platform's user list. Someone who signed up on the
// platform directly appears in one and not the other, and there was no single
// place to see the whole book.
//
// A client becomes an investor when a deposit is confirmed, which is also what
// sets the lead's status to 'converted'.
export async function GET(req: Request) {
  try {
    await requirePermission('lead.read');
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') ?? 'all'; // all | clients | investors
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();

    const supabase = createClient();
    const { data: leads } = await supabase
      .from('leads')
      .select('id, full_name, email, phone, status, source, created_at, platform_user_id, converted_at, assignee:assigned_to(full_name, email)')
      .order('created_at', { ascending: false });

    // Platform users, when the integration is wired. Tolerate it being down —
    // the CRM half of the directory is still worth showing.
    let users: any[] = [];
    if (isPlatformConfigured()) {
      try {
        const res = await platform.listUsers({ limit: 200, offset: 0 });
        users = res.users ?? [];
      } catch { /* platform unreachable — CRM rows only */ }
    }
    const userById = new Map(users.map((u) => [u.id, u]));

    type Row = {
      lead_id: string | null;
      platform_user_id: string | null;
      name: string | null;
      email: string | null;
      phone: string | null;
      source: string | null;
      status: string | null;
      is_investor: boolean;
      total_balance: number | null;
      total_deposited: number | null;
      assignee: string | null;
      created_at: string;
      converted_at: string | null;
    };

    const rows: Row[] = [];
    const seenUserIds = new Set<string>();

    for (const l of leads ?? []) {
      const u = l.platform_user_id ? userById.get(l.platform_user_id) : undefined;
      if (u) seenUserIds.add(u.id);
      // Deposited money is what makes someone an investor. Fall back to the
      // lead's own status when the platform figure is unavailable.
      const deposited = Number(u?.total_deposited ?? 0);
      const assignee = l.assignee as { full_name?: string; email?: string } | null;
      rows.push({
        lead_id: l.id,
        platform_user_id: l.platform_user_id,
        name: l.full_name ?? u?.full_name ?? null,
        email: l.email ?? u?.email ?? null,
        phone: l.phone ?? null,
        source: l.source ?? null,
        status: l.status ?? null,
        is_investor: deposited > 0 || l.status === 'converted',
        total_balance: u ? Number(u.total_balance ?? 0) : null,
        total_deposited: u ? deposited : null,
        assignee: assignee?.full_name ?? assignee?.email ?? null,
        created_at: l.created_at,
        converted_at: l.converted_at ?? null,
      });
    }

    // Platform users with no CRM record — signed up directly rather than
    // through a rep. Without these the directory would not actually be everyone.
    for (const u of users) {
      if (seenUserIds.has(u.id)) continue;
      const deposited = Number(u.total_deposited ?? 0);
      rows.push({
        lead_id: null,
        platform_user_id: u.id,
        name: u.full_name ?? null,
        email: u.email ?? null,
        phone: u.phone ?? null,
        source: u.source ?? 'platform',
        status: null,
        is_investor: deposited > 0,
        total_balance: Number(u.total_balance ?? 0),
        total_deposited: deposited,
        assignee: null,
        created_at: u.created_at,
        converted_at: null,
      });
    }

    let filtered = rows;
    if (filter === 'clients') filtered = rows.filter((r) => !r.is_investor);
    if (filter === 'investors') filtered = rows.filter((r) => r.is_investor);
    if (search) {
      filtered = filtered.filter((r) =>
        (r.name ?? '').toLowerCase().includes(search) ||
        (r.email ?? '').toLowerCase().includes(search) ||
        (r.phone ?? '').toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return ok({
      rows: filtered,
      counts: {
        all: rows.length,
        investors: rows.filter((r) => r.is_investor).length,
        clients: rows.filter((r) => !r.is_investor).length,
      },
      platform_configured: isPlatformConfigured(),
    });
  } catch (e) {
    return handleError(e);
  }
}
