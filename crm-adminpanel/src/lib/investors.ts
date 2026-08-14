import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { platform } from '@/lib/crypto-platform/client';
import { getSetting } from '@/lib/settings';
import type { InvestorSnapshot } from '@/lib/crypto-platform/types';

// ============================================================================
// Investor snapshot service.
//
// Pulls live investor data from the vtmarkets integration API and keeps a
// SHORT-TTL cache in investor_cache for dashboard performance. The cache is
// explicitly NOT the source of truth — it exists only to avoid hammering the
// platform API when many admins view the dashboard at once.
// ============================================================================

interface CachedSnapshot {
  snapshot: InvestorSnapshot;
  fetched_at: string;
  stale: boolean;
}

export async function getInvestorSnapshot(
  platformUserId: string,
  { force = false }: { force?: boolean } = {}
): Promise<CachedSnapshot> {
  const admin = createAdminClient();
  const ttlMs = (await getSetting<number>('investor.cache_ttl_seconds')) * 1000;

  if (!force) {
    const { data: cached } = await admin
      .from('investor_cache')
      .select('snapshot, fetched_at')
      .eq('platform_user_id', platformUserId)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < ttlMs) {
      return { snapshot: cached.snapshot as InvestorSnapshot, fetched_at: cached.fetched_at, stale: false };
    }
  }

  // Refresh from the platform (live).
  const snapshot = await platform.getSnapshot(platformUserId);
  const fetched_at = new Date().toISOString();

  // Best-effort cache write; link to the lead if one exists.
  const { data: lead } = await admin
    .from('leads')
    .select('id')
    .eq('platform_user_id', platformUserId)
    .maybeSingle();

  await admin.from('investor_cache').upsert({
    platform_user_id: platformUserId,
    lead_id: lead?.id ?? null,
    snapshot,
    fetched_at,
  });

  return { snapshot, fetched_at, stale: false };
}

/** Update the cached snapshot from an inbound webhook (push path). */
export async function touchCacheFromEvent(platformUserId: string): Promise<void> {
  try {
    await getInvestorSnapshot(platformUserId, { force: true });
  } catch (e) {
    console.error('[investors] cache refresh from event failed:', (e as Error).message);
  }
}
