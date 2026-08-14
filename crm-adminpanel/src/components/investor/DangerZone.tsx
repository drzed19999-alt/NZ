'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { can, type Role } from '@/lib/rbac';
import { Button, Field, Modal, Panel, TextInput } from '@/components/ui';
import { useAction } from './useAction';

/**
 * Irreversible operations, kept separate from the everyday controls.
 * Deleting is owner-only (`investor.delete`) and requires typing the account
 * email; the platform re-checks that email server-side before deleting.
 */
export function DangerZone({ id, role, user }: { id: string; role: Role; user: any }) {
  const canClose = can(role, 'investor.action');
  const canDelete = can(role, 'investor.delete');
  const router = useRouter();
  const { busy, msg, run } = useAction(id, () => router.refresh());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');

  if (!canClose && !canDelete) return null;

  return (
    <Panel title="Account lifecycle" action={msg ? <span className="text-xs muted">{msg}</span> : undefined}>
      <div className="flex gap-2 flex-wrap">
        {canClose && (
          <Button variant="danger" disabled={busy}
            onClick={() => run({ action: 'close_account', reason: 'Closed from CRM' }, 'Account closed')}>
            Close account
          </Button>
        )}
        {canDelete && (
          <Button variant="danger" disabled={busy} onClick={() => setConfirmOpen(true)}>
            Delete permanently
          </Button>
        )}
      </div>
      <div className="muted text-xs mt-2">
        Closing sets the status to <code>closed</code> and can be undone. Deleting removes the user together with
        every balance, transaction, position and KYC record — that cannot be undone.
      </div>

      {confirmOpen && (
        <Modal
          onClose={() => setConfirmOpen(false)}
          title="Delete this account permanently?"
          subtitle={user.email}
          footer={<>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" busy={busy} busyLabel="Deleting…"
              disabled={typed.trim().toLowerCase() !== String(user.email).toLowerCase()}
              onClick={async () => {
                const okd = await run({ action: 'delete_account', confirm_email: typed.trim() }, 'Account deleted');
                if (okd) router.push('/investors');
              }}>
              Delete permanently
            </Button>
          </>}
        >
          <p className="text-sm mb-3">
            This deletes the platform user and cascades to every account, transaction, position, KYC record and
            activity entry. There is no undo.
          </p>
          <Field label={`Type ${user.email} to confirm`}>
            <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={user.email} />
          </Field>
        </Modal>
      )}
    </Panel>
  );
}
