'use client';

import { useState } from 'react';
import { can, type Role } from '@/lib/rbac';
import { Button, Panel, Pill, Select, TextInput } from '@/components/ui';
import { useAction } from './useAction';

export function PaymentMethodsPanel({
  id, role, methods, onDone,
}: { id: string; role: Role; methods: any[]; onDone: () => void }) {
  const allowed = can(role, 'investor.edit');
  const { busy, msg, run } = useAction(id, onDone);
  const [form, setForm] = useState({ kind: 'card', label: '', masked: '', holder: '', detail: '' });

  return (
    <Panel title="Payment methods" action={msg ? <span className="text-xs muted">{msg}</span> : undefined}>
      {methods.length === 0 && <div className="muted text-sm mb-3">No payment methods on file.</div>}
      {methods.map((m) => (
        <div key={m.id} className="flex items-center justify-between text-sm py-1.5 gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{m.label} <span className="muted">{m.masked}</span></div>
            <div className="muted text-xs truncate">{[m.holder, m.detail].filter(Boolean).join(' · ') || m.kind}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {m.verified && <Pill tone="pos">Verified</Pill>}
            {allowed && (
              <Button className="text-xs" disabled={busy}
                onClick={() => run({ action: 'delete_payment_method', payment_method_id: m.id }, 'Method removed')}>
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}

      {allowed && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="label mb-2">Add a method</div>
          <div className="flex gap-2 flex-wrap">
            <Select className="max-w-[110px]" options={['card', 'bank', 'crypto']} value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })} />
            <TextInput className="max-w-[150px]" placeholder="Label" value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <TextInput className="max-w-[160px]" placeholder="Masked (•••• 4892)" value={form.masked}
              onChange={(e) => setForm({ ...form, masked: e.target.value })} />
            <TextInput className="max-w-[150px]" placeholder="Holder" value={form.holder}
              onChange={(e) => setForm({ ...form, holder: e.target.value })} />
            <TextInput className="max-w-[150px]" placeholder="Detail (expiry / SWIFT)" value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })} />
            <Button variant="primary" disabled={busy || !form.label || !form.masked}
              onClick={() => run({
                action: 'add_payment_method',
                payment_method: {
                  kind: form.kind,
                  label: form.label,
                  masked: form.masked,
                  holder: form.holder || undefined,
                  detail: form.detail || undefined,
                },
              }, 'Method added')}>
              Add
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
