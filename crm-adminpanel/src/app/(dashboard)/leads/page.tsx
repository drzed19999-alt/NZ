'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { generatePassword } from '@/lib/password';
import {
  Button, Checkbox, DataTable, ErrorText, Field, FilterBar, InsetBox, Modal, Notice,
  PageHeader, RadioCard, Select, StatusBadge, TextInput, type Column,
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
  const [createAccount, setCreateAccount] = useState(false);
  const [mode, setMode] = useState<'password' | 'email'>('password');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);

  // Account creation requires the email; if the rep unchecks it or clears
  // the email, drop any partial error so the disabled state reads clean.
  const emailMissing = createAccount && !form.email;
  const passwordTooShort = createAccount && mode === 'password' && password.length < 8;
  const canSubmit = !emailMissing && !passwordTooShort;

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const lead = (await api.post('/api/leads', form)).lead;

      // Only try to convert if the rep opted in and we have an email.
      if (createAccount && lead?.id && form.email) {
        const body: any = { send_activation_email: mode === 'email' };
        if (mode === 'password') {
          body.password = password;
          // The rep hands this password over as-is — skip the forced change.
          body.require_password_change = false;
        }
        try {
          const conv = await api.post(`/api/leads/${lead.id}/convert`, body);
          onCreated();
          setDone({ lead, ...conv });
          return;
        } catch (convErr: any) {
          // Lead saved but account creation failed — let the rep see the
          // error and retry from the lead detail page.
          onCreated();
          setErr(`Lead saved, but account creation failed: ${convErr.message}`);
          return;
        }
      }

      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Lead & account created"
        footer={<Button variant="primary" full onClick={onClose}>Done</Button>}>
        <p className="text-sm mb-3">
          Lead saved and platform user <code>{done.platform_user.id.slice(0, 8)}</code> is linked.
        </p>
        {mode === 'password' ? (
          <InsetBox className="p-3 text-sm">
            <div className="muted text-xs mb-1">Give these credentials to the client:</div>
            <div><b>Login:</b> {done.login_url}</div>
            <div><b>Email:</b> {form.email}</div>
            <div><b>Password:</b> <code>{password}</code></div>
            <div className="muted text-xs mt-2">
              This password is not stored anywhere in plain text — copy it now.
            </div>
          </InsetBox>
        ) : (
          <p className="text-sm muted">An activation link was sent so the client can set their own password.</p>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title="New lead"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} busy={saving} busyLabel="Saving…" disabled={!canSubmit}>
          {createAccount ? 'Create lead & account' : 'Create lead'}
        </Button>
      </>}
    >
      {NEW_LEAD_FIELDS.map((f) => (
        <Field key={f} label={f.replace('_', ' ')} className="mb-3">
          <TextInput value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
        </Field>
      ))}

      <div className="mt-4 pt-4 border-t">
        <Checkbox
          label="Also create a platform account for this lead"
          checked={createAccount}
          onChange={(e) => setCreateAccount(e.target.checked)}
        />

        {createAccount && (
          <div className="mt-3 space-y-3">
            {emailMissing && (
              <Notice tone="warn">An email is required to create a platform account.</Notice>
            )}

            <RadioCard
              checked={mode === 'password'}
              onChange={() => setMode('password')}
              title="Set a password now"
              description="Account is active immediately — give the client their login details."
            />

            {mode === 'password' && (
              <div className="pl-6 flex gap-2">
                <TextInput placeholder="At least 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <Button className="whitespace-nowrap" onClick={() => setPassword(generatePassword())}>
                  Generate
                </Button>
              </div>
            )}

            <RadioCard
              checked={mode === 'email'}
              onChange={() => setMode('email')}
              title="Send activation email"
              description="The client sets their own password via a secure link."
            />
          </div>
        )}
      </div>

      <ErrorText className="mt-3">{err}</ErrorText>
    </Modal>
  );
}
