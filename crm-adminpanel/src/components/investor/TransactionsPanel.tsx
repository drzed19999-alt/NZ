'use client';

import { useState } from 'react';
import { can, type Role } from '@/lib/rbac';
import { money, dateTime } from '@/lib/format';
import {
  Button, Checkbox, Field, Modal, Panel, Select, StatusBadge, TextInput,
} from '@/components/ui';
import { useAction } from './useAction';

const TXN_TYPES = ['deposit', 'withdrawal', 'trade', 'fee', 'adjustment'];
const TXN_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

export function TransactionsPanel({
  id, role, transactions, onDone,
}: { id: string; role: Role; transactions: any[]; onDone: () => void }) {
  const allowed = can(role, 'investor.txn');
  const { busy, msg, run } = useAction(id, onDone);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'deposit', status: 'completed', amount: '', note: '',
    apply_to_balance: true, account_type: 'spot',
  });

  return (
    <Panel
      title="Transactions"
      action={<span className="flex items-center gap-2">
        {msg && <span className="text-xs muted">{msg}</span>}
        {allowed && <Button className="text-xs" onClick={() => setOpen(true)}>+ New</Button>}
      </span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Type</th><th className="th">Amount</th>
              <th className="th">Status</th><th className="th">Date</th>
              {allowed && <th className="th">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr><td className="td muted text-center py-6" colSpan={allowed ? 5 : 4}>No transactions.</td></tr>
            )}
            {transactions.slice(0, 25).map((t) => (
              <tr key={t.id}>
                <td className="td capitalize">{t.type}</td>
                <td className="td">{money(t.amount, t.currency)}</td>
                <td className="td"><StatusBadge status={t.status} /></td>
                <td className="td muted text-xs">{dateTime(t.created_at)}</td>
                {allowed && (
                  <td className="td">
                    <div className="flex gap-1.5 items-center">
                      <Select
                        className="max-w-[130px]"
                        options={TXN_STATUSES}
                        value={t.status}
                        disabled={busy}
                        onChange={(e) => run({
                          action: 'update_transaction',
                          transaction_id: t.id,
                          transaction_patch: { status: e.target.value },
                        }, 'Transaction updated')}
                      />
                      {t.status !== 'cancelled' && (
                        <Button className="text-xs" disabled={busy}
                          onClick={() => run({
                            action: 'reverse_transaction',
                            transaction_id: t.id,
                            reason: 'Reversed from CRM',
                          }, 'Transaction reversed')}>
                          Reverse
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          title="New transaction"
          footer={<>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" busy={busy} busyLabel="Saving…" disabled={!form.amount}
              onClick={async () => {
                const okd = await run({
                  action: 'create_transaction',
                  transaction: {
                    type: form.type,
                    status: form.status,
                    amount: Number(form.amount),
                    note: form.note || undefined,
                    apply_to_balance: form.apply_to_balance,
                    account_type: form.account_type,
                  },
                }, 'Transaction created');
                if (okd) setOpen(false);
              }}>
              Create
            </Button>
          </>}
        >
          <Field label="Type" className="mb-3">
            <Select options={TXN_TYPES} value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </Field>
          <Field label="Status" className="mb-3">
            <Select options={TXN_STATUSES} value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </Field>
          <Field label="Amount" className="mb-3">
            <TextInput type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Note (audited)" className="mb-3">
            <TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Field label="Account" className="mb-3">
            <Select options={['spot', 'futures', 'funding']} value={form.account_type}
              onChange={(e) => setForm({ ...form, account_type: e.target.value })} />
          </Field>
          <Checkbox
            checked={form.apply_to_balance}
            onChange={(e) => setForm({ ...form, apply_to_balance: e.target.checked })}
            label="Move the account balance to match (off = record the entry only)"
          />
        </Modal>
      )}
    </Panel>
  );
}
