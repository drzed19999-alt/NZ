import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { platform, isPlatformConfigured } from '@/lib/crypto-platform/client';

export const dynamic = 'force-dynamic';

// GET /api/investors — the investor directory.
// Live list from the vtmarkets integration API, joined with the CRM's own
// lead links (assigned rep, lead source) so admins see converted investors
// with their originating CRM context.
export async function GET(req: Request) {
  try {
    await requirePermission('investor.read');
    if (!isPlatformConfigured()) {
      return ok({ configured: false, investors: [], paging: { limit: 0, offset: 0, total: 0 } });
    }

    const url = new URL(req.url);
    const params = {
      search: url.searchParams.get('search') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      kyc: url.searchParams.get('kyc') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '50', 10),
      offset: parseInt(url.searchParams.get('offset') ?? '0', 10),
    };

    const { users, paging } = await platform.listUsers(params);

    // Enrich with CRM lead context (assignment + source campaign) in one query.
    const supabase = createClient();
    const ids = users.map((u) => u.id);
    const { data: leads } = await supabase
      .from('leads')
      .select('id, platform_user_id, assigned_to, meta_campaign, source, assignee:assigned_to(full_name, email)')
      .in('platform_user_id', ids.length ? ids : ['—']);

    const leadByUser = new Map((leads ?? []).map((l) => [l.platform_user_id, l]));

    const investors = users.map((u) => ({
      ...u,
      crm: leadByUser.get(u.id)
        ? {
            lead_id: leadByUser.get(u.id)!.id,
            assigned_to: (leadByUser.get(u.id) as any).assignee ?? null,
            campaign: leadByUser.get(u.id)!.meta_campaign ?? u.source_campaign,
            source: leadByUser.get(u.id)!.source,
          }
        : null,
    }));

    return ok({ configured: true, investors, paging });
  } catch (e) {
    return handleError(e);
  }
}
