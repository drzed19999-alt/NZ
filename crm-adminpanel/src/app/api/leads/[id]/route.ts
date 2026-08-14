import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok, err, getIp } from '@/lib/http';
import { updateLeadSchema } from '@/lib/validation';
import { recordLeadHistory } from '@/lib/leads';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/leads/:id — lead + notes + follow-ups + history
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const viewer = await requirePermission('lead.read');
    const supabase = createClient();

    const [lead, notes, followups, history] = await Promise.all([
      supabase.from('leads').select('*, assignee:assigned_to(id, full_name, email)').eq('id', params.id).single(),
      supabase.from('lead_notes').select('*, author:author_id(full_name, email)').eq('lead_id', params.id).order('created_at', { ascending: false }),
      supabase.from('lead_followups').select('*').eq('lead_id', params.id).order('due_at', { ascending: true }),
      supabase.from('lead_history').select('*, actor:actor_id(full_name, email)').eq('lead_id', params.id).order('created_at', { ascending: false }),
    ]);

    if (lead.error) return err(404, 'not_found', 'Lead not found');
    return ok({
      lead: lead.data,
      notes: notes.data ?? [],
      followups: followups.data ?? [],
      history: history.data ?? [],
      viewer_role: viewer.role,
    });
  } catch (e) {
    return handleError(e);
  }
}

// PATCH /api/leads/:id — update fields (status, assignment, tags, contact info)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.write');
    const body = await req.json();
    const patch = updateLeadSchema.parse(body);
    const supabase = createClient();

    // Capture previous state for the history/audit diff.
    const { data: before } = await supabase.from('leads').select('status, assigned_to').eq('id', params.id).single();

    const { data: lead, error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw error;

    if (patch.status && before?.status !== patch.status) {
      await recordLeadHistory(params.id, admin.id, 'status_changed', { from: before?.status, to: patch.status });
    }
    if (patch.assigned_to !== undefined && before?.assigned_to !== patch.assigned_to) {
      await recordLeadHistory(params.id, admin.id, 'assigned', { to: patch.assigned_to });
    }
    await audit(admin, 'lead.update', { entityType: 'lead', entityId: params.id, data: patch, ip: getIp(req) });

    return ok({ lead });
  } catch (e) {
    return handleError(e);
  }
}

// DELETE /api/leads/:id — requires elevated permission
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.delete');
    const supabase = createClient();
    const { error } = await supabase.from('leads').delete().eq('id', params.id);
    if (error) throw error;
    await audit(admin, 'lead.delete', { entityType: 'lead', entityId: params.id, ip: getIp(req) });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
