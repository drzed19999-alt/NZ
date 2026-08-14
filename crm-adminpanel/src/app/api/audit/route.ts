import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

// GET /api/audit — recent audit log entries (manager+)
export async function GET(req: Request) {
  try {
    await requirePermission('audit.read');
    const supabase = createClient();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);
    const action = url.searchParams.get('action') ?? '';

    let query = supabase
      .from('audit_logs')
      .select('*, actor:actor_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;
    if (error) throw error;
    return ok({ logs: data });
  } catch (e) {
    return handleError(e);
  }
}
