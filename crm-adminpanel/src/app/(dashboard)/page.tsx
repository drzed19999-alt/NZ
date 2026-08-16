'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import { timeAgo, compactMoney } from '@/lib/format';
import {
  Button, FeedRow, InsetBox, PageHeader, Panel, PanelLink, Pill, SkeletonList, SkeletonStats,
  StatGrid, StatStrip, StatusBadge, type StatItem,
} from '@/components/ui';

interface Stats {
  leads: { total: number; new: number; converted: number };
  open_alerts: number;
  platform_configured: boolean;
  platform: { total_users: number; active_users: number; online_now: number; kyc_pending: number; total_balance: number; total_deposited: number } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [acking, setAcking] = useState<string | null>(null);

  async function acknowledge(id: string) {
    setAcking(id);
    // Drop it locally straight away; realtime will confirm.
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await api.patch(`/api/alerts/${id}`, { acknowledged: true });
      api.get<Stats>('/api/stats').then(setStats).catch(() => {});
    } catch {
      // Put it back if the server rejected the change.
      loadLive();
    } finally {
      setAcking(null);
    }
  }

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('leads').select('id, full_name, email, status, source, created_at').order('created_at', { ascending: false }).limit(7),
      supabase.from('alerts').select('*').eq('acknowledged', false).order('created_at', { ascending: false }).limit(7),
    ]);
    setLeads(l ?? []);
    setAlerts(a ?? []);
    setFeedLoading(false);
  }, []);

  useEffect(() => {
    api.get<Stats>('/api/stats').then(setStats).catch(() => {});
    loadLive();

    // Live dashboard: Supabase realtime pushes new leads/alerts without polling.
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadLive)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, loadLive)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadLive]);

  const na = stats?.platform_configured ? '—' : 'n/a';
  const primary: StatItem[] = [
    { label: 'Assets under custody', value: stats?.platform ? compactMoney(stats.platform.total_balance) : na, hero: true },
    { label: 'Total deposited', value: stats?.platform ? compactMoney(stats.platform.total_deposited) : na },
    { label: 'Investors', value: stats?.platform?.total_users ?? na },
    { label: 'Online now', value: stats?.platform?.online_now ?? na, live: true },
  ];
  const secondary = [
    { label: 'Total leads', value: stats?.leads.total ?? '—' },
    { label: 'New leads', value: stats?.leads.new ?? '—' },
    { label: 'Converted', value: stats?.leads.converted ?? '—' },
    { label: 'KYC pending', value: stats?.platform?.kyc_pending ?? na },
    { label: 'Open alerts', value: stats?.open_alerts ?? '—' },
  ];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        eyebrow="Overview"
        title="Client Desk"
        actions={stats && !stats.platform_configured
          ? <Pill tone="warn">Platform API not connected</Pill>
          : undefined}
      />

      {stats ? <StatGrid items={primary} /> : <SkeletonStats count={4} />}

      <StatStrip items={secondary} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel lux padding="p-5" title="Recent leads" eyebrow="Live feed"
          action={<PanelLink href="/leads">View all →</PanelLink>}>
          <div className="space-y-0.5">
            {feedLoading && <SkeletonList rows={5} />}
            {!feedLoading && leads.length === 0 && <div className="muted text-[13px] py-6 text-center">No leads yet.</div>}
            {!feedLoading && leads.map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`} className="block rounded-[10px] px-3 py-2.5 row-hover">
                <FeedRow
                  title={l.full_name || l.email || 'Unnamed lead'}
                  meta={<>{l.email} · <span className="capitalize">{l.source}</span> · {timeAgo(l.created_at)}</>}
                  trailing={<StatusBadge status={l.status} />}
                />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel lux padding="p-5" title="Alerts" eyebrow="Requires attention">
          <div className="space-y-2">
            {feedLoading && <SkeletonList rows={4} />}
            {!feedLoading && alerts.length === 0 && <div className="muted text-[13px] py-6 text-center">Nothing flagged.</div>}
            {!feedLoading && alerts.map((a) => (
              <InsetBox key={a.id} bordered className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill tone={a.severity === 'critical' ? 'neg' : a.severity === 'warning' ? 'warn' : 'info'}>
                        {String(a.type).replace(/_/g, ' ')}
                      </Pill>
                      {a.platform_user_id ? (
                        <Link href={`/investors/${a.platform_user_id}`} className="text-[13px] hover:underline">
                          {a.title}
                        </Link>
                      ) : (
                        <span className="text-[13px]">{a.title}</span>
                      )}
                    </div>
                    <div className="muted text-[11px] mt-1">{timeAgo(a.created_at)}</div>
                  </div>
                  {/* Without this the feed only ever grew — the column existed but
                      nothing could set it. */}
                  <Button
                    className="text-[11px] shrink-0"
                    disabled={acking === a.id}
                    onClick={() => acknowledge(a.id)}
                    title="Acknowledge and remove from the feed"
                  >
                    {acking === a.id ? '…' : 'Dismiss'}
                  </Button>
                </div>
              </InsetBox>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
