import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { handleError, ok } from '@/lib/http';
import { platform, isPlatformConfigured } from '@/lib/crypto-platform/client';

export const dynamic = 'force-dynamic';

// GET /api/stats — dashboard tiles: CRM-native counts + live platform stats.
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createClient();

    const [total, newLeads, converted, openAlerts] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
    ]);

    let platformStats = null;
    let platformConfigured = false;
    if (isPlatformConfigured()) {
      platformConfigured = true;
      try {
        platformStats = await platform.stats();
      } catch {
        platformStats = null;
      }
    }

    return ok({
      leads: {
        total: total.count ?? 0,
        new: newLeads.count ?? 0,
        converted: converted.count ?? 0,
      },
      open_alerts: openAlerts.count ?? 0,
      platform_configured: platformConfigured,
      platform: platformStats,
    });
  } catch (e) {
    return handleError(e);
  }
}
