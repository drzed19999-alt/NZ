'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLiveRefresh } from '@/lib/useLiveRefresh';
import { money, timeAgo } from '@/lib/format';
import {
  DataTable, FilterBar, PageHeader, Pill, Select, StatGrid, StatusBadge,
  TextInput, type Column, type StatItem,
} from '@/components/ui';

interface Row {
  lead_id: string | null;
  platform_user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  is_investor: boolean;
  total_balance: number | null;
  total_deposited: number | null;
  assignee: string | null;
  created_at: string;
  converted_at: string | null;
}

const FILTERS = [
  { value: 'all', label: 'Everyone' },
  { value: 'clients', label: 'Clients only' },
  { value: 'investors', label: 'Investors only' },
];

// One row can point at a CRM record, a platform account, or both. Link to
// whichever exists, preferring the investor view once they have deposited.
function nameCell(r: Row) {
  const label = r.name || r.email || 'Unnamed';
  const href = r.is_investor && r.platform_user_id
    ? `/investors/${r.platform_user_id}`
    : r.lead_id
      ? `/leads/${r.lead_id}`
      : r.platform_user_id
        ? `/investors/${r.platform_user_id}`
        : null;

  return href
    ? <Link href={href} className="font-semibold" style={{ color: 'var(--gold-soft)' }}>{label}</Link>
    : <span className="font-semibold">{label}</span>;
}

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Name', cell: nameCell },
  {
    key: 'type',
    header: 'Type',
    cell: (r) => r.is_investor
      ? <Pill tone="pos">Investor</Pill>
      : <Pill tone="info">Client</Pill>,
  },
  { key: 'contact', header: 'Contact', cell: (r) => r.email || r.phone || '—' },
  {
    key: 'deposited',
    header: 'Deposited',
    cell: (r) => r.total_deposited === null
      ? <span className="muted">—</span>
      : money(r.total_deposited),
  },
  {
    key: 'balance',
    header: 'Balance',
    cell: (r) => r.total_balance === null
      ? <span className="muted">—</span>
      : money(r.total_balance),
  },
  {
    key: 'status',
    header: 'Pipeline',
    cell: (r) => r.status
      ? <StatusBadge status={r.status} />
      : <span className="muted text-[12px]">direct signup</span>,
  },
  {
    key: 'assignee',
    header: 'Rep',
    cell: (r) => r.assignee ?? <span className="muted">Unassigned</span>,
  },
  { key: 'created', header: 'Added', className: 'muted text-[12px]', cell: (r) => timeAgo(r.created_at) },
];

export default function DirectoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ all: 0, clients: 0, investors: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ filter });
    if (search) q.set('search', search);
    try {
      const res = await api.get(`/api/directory?${q.toString()}`);
      setRows(res.rows);
      setCounts(res.counts);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useLiveRefresh(load, 30000);

  const tiles: StatItem[] = [
    { label: 'Everyone', value: counts.all, hero: true },
    { label: 'Investors', value: counts.investors },
    { label: 'Clients', value: counts.clients },
    {
      label: 'Conversion',
      value: counts.all ? `${Math.round((counts.investors / counts.all) * 100)}%` : '—',
    },
  ];

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        eyebrow="Directory"
        title="Clients & investors"
        subtitle="Everyone on the book. A client becomes an investor when their first deposit is confirmed."
      />

      <StatGrid items={tiles} />

      <FilterBar>
        <TextInput className="max-w-xs" placeholder="Search name, email, phone…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="max-w-[180px]" options={FILTERS}
          value={filter} onChange={(e) => setFilter(e.target.value)} />
      </FilterBar>

      <DataTable columns={COLUMNS} rows={rows} loading={loading}
        rowKey={(r) => r.lead_id ?? r.platform_user_id ?? r.email ?? String(Math.random())}
        empty="Nobody here yet." />
    </div>
  );
}
