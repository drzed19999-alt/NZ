'use client';

import { useState } from 'react';
import { can, type Role } from '@/lib/rbac';
import { money } from '@/lib/format';
import { Button, Panel, Select, TextInput } from '@/components/ui';
import { useAction } from './useAction';

export function PositionsPanel({
  id, role, positions, onDone,
}: { id: string; role: Role; positions: any[]; onDone: () => void }) {
  const allowed = can(role, 'investor.position');
  const { busy, msg, run } = useAction(id, onDone);
  const [form, setForm] = useState({ symbol: 'BTC/USDT', side: 'long', size: '', entry_price: '' });

  return (
    <Panel title="Open positions" action={msg ? <span className="text-xs muted">{msg}</span> : undefined}>
      {positions.length === 0 && <div className="muted text-sm mb-3">No open positions.</div>}
      {positions.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-sm py-1.5 gap-2">
          <span>{p.symbol} <span className="muted">{p.side} {p.size} @ {money(p.entry_price)}</span></span>
          <span className="flex items-center gap-2">
            <span style={{ color: p.pnl >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{money(p.pnl)}</span>
            {allowed && (
              <Button className="text-xs" disabled={busy}
                onClick={() => run({ action: 'close_position', position_id: p.id }, 'Position closed')}>
                Close
              </Button>
            )}
          </span>
        </div>
      ))}

      {allowed && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="label mb-2">Open a position</div>
          <div className="flex gap-2 flex-wrap">
            <TextInput className="max-w-[130px]" placeholder="Symbol" value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <Select className="max-w-[110px]" options={['long', 'short']} value={form.side}
              onChange={(e) => setForm({ ...form, side: e.target.value })} />
            <TextInput className="max-w-[110px]" type="number" placeholder="Size" value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <TextInput className="max-w-[130px]" type="number" placeholder="Entry price" value={form.entry_price}
              onChange={(e) => setForm({ ...form, entry_price: e.target.value })} />
            <Button variant="primary" disabled={busy || !form.size || !form.entry_price}
              onClick={() => run({
                action: 'open_position',
                position: {
                  symbol: form.symbol,
                  side: form.side,
                  size: Number(form.size),
                  entry_price: Number(form.entry_price),
                },
              }, 'Position opened')}>
              Open
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
