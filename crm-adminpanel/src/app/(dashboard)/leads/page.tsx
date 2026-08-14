'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import {
  Button, DataTable, ErrorText, Field, FilterBar, Modal,
  PageHeader, Select, StatusBadge, TextInput, type Column,
} from '@/components/ui';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost', 'unresponsive'];

const COLUMNS: Column<any>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (l) => (
      <Link href={`/leads/${l.id}`} className="font-semibold" style={{ color: 'var(--gold-soft)' }}>
        {l.full_name || 'Unnamed'}
      </Link>
    ),
  },
  { key: 'contact', header: 'Contact', cell: (l) => l.email || l.phone || '—' },
  { key: 'source', header: 'Source', className: 'capitalize muted', cell: (l) => l.source },
  {
    key: 'assigned',
    header: 'Assigned',
    cell: (l) => l.assignee?.full_name || l.assignee?.email || <span className="muted">Unassigned</span>,
  },
  { key: 'status', header: 'Status', cell: (l) => <StatusBadge status={l.status} /> },
  { key: 'created', header: 'Created', className: 'muted text-[12px]', cell: (l) => timeAgo(l.created_at) },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    try {
      const res = await api.get(`/api/leads?${q.toString()}`);
      setLeads(res.leads);
      setTotal(res.paging.total);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-5 animate-in">
      <PageHeader
        eyebrow="Pipeline"
        title={<>Leads <span className="muted text-[18px]">({total})</span></>}
        actions={<Button variant="primary" onClick={() => setShowNew(true)}>+ New lead</Button>}
      />

      <FilterBar>
        <TextInput className="max-w-xs" placeholder="Search name, email, phone…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="max-w-[180px]" placeholder="All statuses" options={STATUSES}
          value={status} onChange={(e) => setStatus(e.target.value)} />
      </FilterBar>

      <DataTable columns={COLUMNS} rows={leads} loading={loading} rowKey={(l) => l.id}
        empty="No leads found." />

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

const NEW_LEAD_FIELDS = ['full_name', 'email', 'phone', 'country'] as const;

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', country: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await api.post('/api/leads', form);
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title="New lead"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} busy={saving} busyLabel="Saving…">Create lead</Button>
      </>}
    >
      {NEW_LEAD_FIELDS.map((f) => (
        <Field key={f} label={f.replace('_', ' ')} className="mb-3">
          <TextInput value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
        </Field>
      ))}
      <ErrorText className="mt-3">{err}</ErrorText>
    </Modal>
  );
}
