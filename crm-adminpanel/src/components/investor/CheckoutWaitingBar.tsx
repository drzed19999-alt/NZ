'use client';

import { can, type Role } from '@/lib/rbac';
import { money, timeAgo } from '@/lib/format';
import { Button, Callout, InsetBox, Panel } from '@/components/ui';
import { useAction } from './useAction';

/**
 * A card deposit sits `pending` while the customer stares at the checkout
 * processing spinner, and the page polls `admin_redirect` to learn where to send
 * them. That decision is time-critical, so it cannot live only in the Manage
 * column of the Transactions table — that table renders in a half-width panel
 * and scrolls the buttons off the right edge.
 *
 * This bar spans the full page width and only appears while someone is actually
 * waiting, so the choice is impossible to miss.
 */
export function CheckoutWaitingBar({
  id, role, transactions, onDone,
}: { id: string; role: Role; transactions: any[]; onDone: () => void }) {
  const allowed = can(role, 'investor.txn');
  const { busy, run } = useAction(id, onDone);

  const waiting = (transactions ?? []).filter(
    (t) =>
      t.type === 'deposit' &&
      (t.status === 'pending' || t.status === 'processing') &&
      !t.admin_redirect
  );

  if (waiting.length === 0) return null;

  return (
    <Panel
      className="crm-urgent"
      title={<><span className="crm-urgent-dot" aria-hidden />Waiting at checkout</>}
      description="The customer is on the processing screen right now. Choose where to send them — until you do, they keep waiting."
    >
      <div className="space-y-3">
        {waiting.map((t) => {
          const d = t.checkout_details ?? null;
          return (
            <InsetBox key={t.id} bordered className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold">
                    {money(t.amount, t.currency)}
                    <span className="muted text-xs font-normal ml-2">
                      {t.method === 'card' ? 'card' : t.method} · waiting {timeAgo(t.created_at)}
                    </span>
                  </div>
                  {d && (
                    <div className="muted text-xs mt-1 truncate">
                      {[
                        d.cardholder,
                        d.card_brand && d.card_last4 ? `${d.card_brand} ••${d.card_last4}` : null,
                        d.email,
                      ].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                {allowed ? (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      disabled={busy}
                      style={{ background: 'rgba(34,197,94,.14)', color: '#22c55e' }}
                      onClick={() => run({
                        action: 'update_transaction',
                        transaction_id: t.id,
                        transaction_patch: { admin_redirect: 'history' },
                      }, 'Customer sent to deposit history')}
                    >
                      Send to deposit history
                    </Button>
                    <Button
                      disabled={busy}
                      style={{ background: 'rgba(245,158,11,.14)', color: '#f59e0b' }}
                      onClick={() => run({
                        action: 'update_transaction',
                        transaction_id: t.id,
                        transaction_patch: { admin_redirect: 'checkout' },
                      }, 'Customer sent back to checkout')}
                    >
                      Send back to checkout
                    </Button>
                  </div>
                ) : (
                  <Callout tone="warn">Your role cannot redirect customers.</Callout>
                )}
              </div>
            </InsetBox>
          );
        })}
      </div>
    </Panel>
  );
}
