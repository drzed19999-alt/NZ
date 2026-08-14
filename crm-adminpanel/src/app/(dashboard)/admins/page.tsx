'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ROLES } from '@/lib/rbac';
import {
  Button, CodeBlock, DataTable, ErrorText, Field, Modal, Notice,
  PageHeader, Select, TextInput, type Column,
} from '@/components/ui';

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try { const r = await api.get('/api/admins'); setAdmins(r.admins); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: any) {
    try { await api.patch(`/api/admins/${id}`, patch); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', cell: (a) => a.full_name || '—' },
    { key: 'email', header: 'Email', cell: (a) => a.email },
    {
      key: 'role',
      header: 'Role',
      cell: (a) => (
        <Select className="max-w-[140px]" options={ROLES} value={a.role}
          onChange={(e) => update(a.id, { role: e.target.value })} />
      ),
    },
    {
      key: 'active',
      header: 'Active',
      cell: (a) => (
        <Button className="text-xs" onClick={() => update(a.id, { active: !a.active })}>
          {a.active ? 'Active' : 'Disabled'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-in">
      <PageHeader
        eyebrow="Access"
        title="CRM Admins"
        actions={<Button variant="primary" onClick={() => setShowNew(true)}>+ Add admin</Button>}
      />
      <Notice tone="error">{err}</Notice>

      <DataTable columns={columns} rows={admins} loading={loading} rowKey={(a) => a.id}
        hover={false} skeletonRows={4} empty="No admins yet." />

      {showNew && <NewAdmin onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

function NewAdmin({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'agent' });
  const [temp, setTemp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await api.post('/api/admins', form);
      if (r.temp_password) { setTemp(r.temp_password); onCreated(); }
      else { onCreated(); onClose(); }
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  // Once created, the modal turns into a one-time reveal of the temp password.
  if (temp) {
    return (
      <Modal onClose={onClose} title="Add CRM admin"
        footer={<Button variant="primary" full onClick={onClose}>Done</Button>}>
        <p className="text-sm mb-2">
          Admin created. Share this temporary password securely — it won&apos;t be shown again:
        </p>
        <CodeBlock>{temp}</CodeBlock>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title="Add CRM admin"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} busy={saving} busyLabel="Creating…">Create</Button>
      </>}
    >
      <Field label="Full name" className="mb-3">
        <TextInput value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </Field>
      <Field label="Email" className="mb-3">
        <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Role">
        <Select options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      </Field>
      <ErrorText className="mt-3">{err}</ErrorText>
    </Modal>
  );
}
