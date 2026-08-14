import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok, getIp } from '@/lib/http';
import { createLeadSchema } from '@/lib/validation';
import { recordLeadHistory } from '@/lib/leads';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/leads — search / filter / paginate
export async function GET(req: Request) {
  try {
    await requirePermission('lead.read');
    const supabase = createClient();
    const url = new URL(req.url);

    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const source = url.searchParams.get('source') ?? '';
    const assigned = url.searchParams.get('assigned_to') ?? '';
    const tag = url.searchParams.get('tag') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    let query = supabase
      .from('leads')
      .select('*, assignee:assigned_to(id, full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (assigned) query = query.eq('assigned_to', assigned);
    if (tag) query = query.contains('tags', [tag]);
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return ok({ leads: data, paging: { limit, offset, total: count ?? 0 } });
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/leads — manually create a lead (works even without Meta)
export async function POST(req: Request) {
  try {
    const admin = await requirePermission('lead.write');
    const body = await req.json();
    const input = createLeadSchema.parse(body);
    const supabase = createClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({ ...input, created_by: admin.id })
      .select('*')
      .single();
    if (error) throw error;

    await recordLeadHistory(lead.id, admin.id, 'created', { source: input.source });
    await audit(admin, 'lead.create', { entityType: 'lead', entityId: lead.id, ip: getIp(req) });

    return ok({ lead }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
