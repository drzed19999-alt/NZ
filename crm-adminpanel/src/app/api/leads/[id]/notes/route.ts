import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { noteSchema } from '@/lib/validation';
import { recordLeadHistory } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// POST /api/leads/:id/notes
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.write');
    const { body } = noteSchema.parse(await req.json());
    const supabase = createClient();

    const { data: note, error } = await supabase
      .from('lead_notes')
      .insert({ lead_id: params.id, author_id: admin.id, body })
      .select('*, author:author_id(full_name, email)')
      .single();
    if (error) throw error;

    await recordLeadHistory(params.id, admin.id, 'note_added', { preview: body.slice(0, 80) });
    return ok({ note }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
