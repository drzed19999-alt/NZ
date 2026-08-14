import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { followupSchema } from '@/lib/validation';
import { recordLeadHistory } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// POST /api/leads/:id/followups — schedule a follow-up
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.write');
    const input = followupSchema.parse(await req.json());
    const supabase = createClient();

    const { data: followup, error } = await supabase
      .from('lead_followups')
      .insert({
        lead_id: params.id,
        title: input.title,
        due_at: input.due_at,
        assigned_to: input.assigned_to ?? admin.id,
        created_by: admin.id,
      })
      .select('*')
      .single();
    if (error) throw error;

    await recordLeadHistory(params.id, admin.id, 'followup_scheduled', { title: input.title, due_at: input.due_at });
    return ok({ followup }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

// PATCH /api/leads/:id/followups?fid=... — mark done
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.write');
    const fid = new URL(req.url).searchParams.get('fid');
    if (!fid) return handleError(new Error('fid required'));
    const supabase = createClient();

    const { data, error } = await supabase
      .from('lead_followups')
      .update({ done: true, done_at: new Date().toISOString() })
      .eq('id', fid)
      .eq('lead_id', params.id)
      .select('*')
      .single();
    if (error) throw error;
    await recordLeadHistory(params.id, admin.id, 'followup_completed', { id: fid });
    return ok({ followup: data });
  } catch (e) {
    return handleError(e);
  }
}
