'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { DataTable, Notice, PageHeader, type Column } from '@/components/ui';

const COLUMNS: Column<any>[] = [
  { key: 'when', header: 'When', className: 'muted text-xs whitespace-nowrap', cell: (l) => dateTime(l.created_at) },
  { key: 'actor', header: 'Actor', className: 'text-sm', cell: (l) => l.actor?.full_name || l.actor_email || 'system' },
  { key: 'action', header: 'Action', className: 'text-sm font-medium', cell: (l) => l.action },
  { key: 'entity', header: 'Entity', className: 'text-xs muted', cell: (l) => `${l.entity_type} ${l.entity_id?.slice(0, 8) ?? ''}` },
  { key: 'details', header: 'Details', className: 'text-xs muted', cell: (l) => <code>{JSON.stringify(l.data)}</code> },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/audit')
      .then((r) => setLogs(r.logs))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-in">
      <PageHeader eyebrow="Compliance" title="Audit log" />
      <Notice tone="error">{err}</Notice>
      <DataTable columns={COLUMNS} rows={logs} loading={loading} rowKey={(l) => l.id}
        hover={false} skeletonRows={8} empty="No audit entries." />
    </div>
  );
}
