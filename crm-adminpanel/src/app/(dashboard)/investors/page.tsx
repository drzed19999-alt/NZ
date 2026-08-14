'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { money, presenceLabel } from '@/lib/format';
import {
  DataTable, EmptyState, FilterBar, PageHeader, PresenceDot, Select,
  StatusBadge, TextInput, type Column,
} from '@/components/ui';

const ACCOUNT_STATUSES = ['active', 'pending', 'restricted', 'suspended', 'closed'];
const KYC_STATUSES = ['verified', 'pending', 'none', 'rejected'];
const SORTS = [
  { value: 'last_active', label: 'Sort: last active' },
  { value: 'total_deposited', label: 'Sort: total deposited' },
  { value: 'total_balance', label: 'Sort: balance' },
  { value: 'created', label: 'Sort: signup date' },
];

const COLUMNS: Column<any>[] = [
  {
    key: 'investor',
    header: 'Investor',
    cell: (u) => (
      <>
        <Link href={`/investors/${u.id}`} className="font-medium" style={{ color: 'var(--gold-soft)' }}>
          {u.full_name || u.email}
        </Link>
        <div className="muted text-xs">{u.email}</div>
      </>
    ),
  },
  {
    key: 'presence',
    header: 'Presence',
    className: 'text-xs',
    cell: (u) => <><PresenceDot online={!!u.presence?.online} />{presenceLabel(u.presence)}</>,
  },
  { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
  { key: 'kyc', header: 'KYC', cell: (u) => <StatusBadge status={u.kyc?.status || 'none'} /> },
  { key: 'balance', header: 'Balance', cell: (u) => money(u.total_balance) },
  { key: 'deposited', header: 'Deposited', cell: (u) => money(u.total_deposited) },
  {
    key: 'rep',
    header: 'Rep',
    className: 'text-xs',
    cell: (u) => u.crm?.assigned_to?.full_name || u.crm?.assigned_to?.email || <span className="muted">—</span>,
  },
  {
    key: 'campaign',
    header: 'Campaign',
    className: 'text-xs',
    cell: (u) => u.crm?.campaign || u.source_campaign || <span className="muted">—</span>,
  },
];

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [kyc, setKyc] = useState('');
  const [sort, setSort] = useState('last_active');

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    if (kyc) q.set('kyc', kyc);
    if (sort) q.set('sort', sort);
    try {
      const res = await api.get(`/api/investors?${q.toString()}`);
      setConfigured(res.configured);
      setInvestors(res.investors ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, status, kyc, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  if (!configured) {
    return (
      <EmptyState title="Platform API not connected">
        Set <code>CRYPTO_PLATFORM_API_URL</code> and <code>CRYPTO_PLATFORM_API_KEY</code> to enable live
        investor monitoring. Lead management works without it.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <PageHeader eyebrow="Portfolio" title="Investors" subtitle="Live from the vtmarkets platform." />

      <FilterBar>
        <TextInput className="max-w-xs" placeholder="Search email, name…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="max-w-[160px]" placeholder="All statuses" options={ACCOUNT_STATUSES}
          value={status} onChange={(e) => setStatus(e.target.value)} />
        <Select className="max-w-[160px]" placeholder="All KYC" options={KYC_STATUSES}
          value={kyc} onChange={(e) => setKyc(e.target.value)} />
        <Select className="max-w-[180px]" options={SORTS}
          value={sort} onChange={(e) => setSort(e.target.value)} />
      </FilterBar>

      <DataTable columns={COLUMNS} rows={investors} loading={loading} rowKey={(u) => u.id}
        skeletonRows={7} empty="No investors found." />
    </div>
  );
}
