import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { platform } from '@/lib/crypto-platform/client';
import { getInvestorSnapshot } from '@/lib/investors';

export const dynamic = 'force-dynamic';

// GET /api/investors/:id — the unified "everything about this investor" view.
// Combines the LIVE platform data (snapshot, balances, transactions, positions,
// platform activity) with the CRM lead's own history into ONE timeline.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const viewer = await requirePermission('investor.read');
    const force = new URL(req.url).searchParams.get('refresh') === '1';

    // Live platform data (snapshot is cached with a short TTL; the rest pulled live).
    // Bot + payment methods are newer endpoints; tolerate an older platform
    // build that does not have them yet rather than failing the whole page.
    const [{ snapshot, fetched_at }, balances, txns, positions, activity, bot, methods] = await Promise.all([
      getInvestorSnapshot(params.id, { force }),
      platform.getBalances(params.id),
      platform.getTransactions(params.id, 100),
      platform.getPositions(params.id),
      platform.getActivity(params.id),
      platform.getBot(params.id).catch(() => null),
      platform.listPaymentMethods(params.id).catch(() => null),
    ]);

    // CRM-side context: the originating lead + its history.
    const supabase = createClient();
    const { data: lead } = await supabase
      .from('leads')
      .select('*, assignee:assigned_to(full_name, email)')
      .eq('platform_user_id', params.id)
      .maybeSingle();

    let crmHistory: any[] = [];
    if (lead) {
      const { data } = await supabase
        .from('lead_history')
        .select('*, actor:actor_id(full_name, email)')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      crmHistory = data ?? [];
    }

    // Build the unified timeline (CRM history + platform activity + transactions).
    const timeline = [
      ...crmHistory.map((h) => ({
        at: h.created_at, kind: 'crm' as const, type: h.type, data: h.data,
        actor: h.actor?.full_name ?? h.actor?.email ?? null,
      })),
      ...activity.activity.map((a) => ({
        at: a.created_at, kind: 'platform' as const, type: a.event, data: a.data, actor: null,
      })),
      ...txns.transactions.map((t) => ({
        at: t.created_at, kind: 'transaction' as const,
        type: `${t.type} ${t.status}`, data: { amount: t.amount, currency: t.currency, method: t.method }, actor: null,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return ok({
      snapshot,
      fetched_at,
      balances,
      transactions: txns.transactions,
      positions: positions.positions,
      bot: bot?.bot ?? null,
      bot_events: bot?.events ?? [],
      payment_methods: methods?.payment_methods ?? [],
      lead: lead ?? null,
      timeline,
      viewer_role: viewer.role,
    });
  } catch (e) {
    return handleError(e);
  }
}
