'use client';

import { useState } from 'react';
import { can, type Role } from '@/lib/rbac';
import { dateTime } from '@/lib/format';
import { Button, Field, Panel, Select, StatusBadge, TextInput } from '@/components/ui';
import { useAction } from './useAction';

/**
 * ProTrader Bot control. The bot's state lives on the platform (bot_configs);
 * `enabled_by_admin` is a hard kill-switch — with it off the customer cannot
 * start the bot at all, and any running bot is moved to `locked`.
 */
export function BotPanel({
  id, role, bot, events, onDone,
}: { id: string; role: Role; bot: any; events: any[]; onDone: () => void }) {
  const allowed = can(role, 'investor.bot');
  const { busy, msg, run } = useAction(id, onDone);
  const [cfg, setCfg] = useState({
    strategy: bot?.strategy ?? 'balanced',
    symbols: (bot?.symbols ?? ['BTC/USDT']).join(', '),
    max_position_size: String(bot?.max_position_size ?? 0),
    daily_loss_limit: String(bot?.daily_loss_limit ?? 0),
    take_profit_pct: String(bot?.take_profit_pct ?? 2),
    stop_loss_pct: String(bot?.stop_loss_pct ?? 1),
    leverage: String(bot?.leverage ?? 1),
    admin_note: bot?.admin_note ?? '',
  });

  if (!bot) {
    return (
      <Panel title="ProTrader Bot">
        <div className="muted text-sm">Bot state unavailable from the platform.</div>
      </Panel>
    );
  }

  const locked = !bot.enabled_by_admin;

  return (
    <Panel
      title="ProTrader Bot"
      action={<span className="flex items-center gap-2">
        {msg && <span className="text-xs muted">{msg}</span>}
        <StatusBadge status={bot.status} />
      </span>}
    >
      <div className="muted text-xs mb-3">
        Last change: {bot.updated_by ?? '—'}{bot.updated_at ? ` · ${dateTime(bot.updated_at)}` : ''}
      </div>

      {allowed && (
        <>
          <div className="flex gap-2 flex-wrap mb-4">
            <Button disabled={busy || locked}
              onClick={() => run({ action: 'update_bot', bot: { status: 'running' } }, 'Bot started')}>Start</Button>
            <Button disabled={busy || locked}
              onClick={() => run({ action: 'update_bot', bot: { status: 'paused' } }, 'Bot paused')}>Pause</Button>
            <Button disabled={busy}
              onClick={() => run({ action: 'update_bot', bot: { status: 'stopped' } }, 'Bot stopped')}>Stop</Button>
            {locked ? (
              <Button variant="primary" disabled={busy}
                onClick={() => run(
                  { action: 'update_bot', bot: { enabled_by_admin: true, status: 'stopped' } },
                  'Bot unlocked',
                )}>
                Unlock for customer
              </Button>
            ) : (
              <Button variant="danger" disabled={busy}
                onClick={() => run({ action: 'update_bot', bot: { enabled_by_admin: false } }, 'Bot locked')}>
                Lock (kill switch)
              </Button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Strategy">
              <Select options={['conservative', 'balanced', 'aggressive']} value={cfg.strategy}
                onChange={(e) => setCfg({ ...cfg, strategy: e.target.value })} />
            </Field>
            <Field label="Symbols (comma separated)">
              <TextInput value={cfg.symbols} onChange={(e) => setCfg({ ...cfg, symbols: e.target.value })} />
            </Field>
            <Field label="Max position size (0 = uncapped)">
              <TextInput type="number" value={cfg.max_position_size}
                onChange={(e) => setCfg({ ...cfg, max_position_size: e.target.value })} />
            </Field>
            <Field label="Daily loss limit (0 = none)">
              <TextInput type="number" value={cfg.daily_loss_limit}
                onChange={(e) => setCfg({ ...cfg, daily_loss_limit: e.target.value })} />
            </Field>
            <Field label="Take profit %">
              <TextInput type="number" value={cfg.take_profit_pct}
                onChange={(e) => setCfg({ ...cfg, take_profit_pct: e.target.value })} />
            </Field>
            <Field label="Stop loss %">
              <TextInput type="number" value={cfg.stop_loss_pct}
                onChange={(e) => setCfg({ ...cfg, stop_loss_pct: e.target.value })} />
            </Field>
            <Field label="Leverage">
              <TextInput type="number" value={cfg.leverage}
                onChange={(e) => setCfg({ ...cfg, leverage: e.target.value })} />
            </Field>
            <Field label="Admin note (shown to the customer)">
              <TextInput value={cfg.admin_note} onChange={(e) => setCfg({ ...cfg, admin_note: e.target.value })} />
            </Field>
          </div>

          <Button variant="primary" className="mt-3" disabled={busy}
            onClick={() => run({
              action: 'update_bot',
              bot: {
                strategy: cfg.strategy,
                symbols: cfg.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
                max_position_size: Number(cfg.max_position_size),
                daily_loss_limit: Number(cfg.daily_loss_limit),
                take_profit_pct: Number(cfg.take_profit_pct),
                stop_loss_pct: Number(cfg.stop_loss_pct),
                leverage: Number(cfg.leverage),
                admin_note: cfg.admin_note || undefined,
              },
            }, 'Bot configuration saved')}>
            Save configuration
          </Button>
        </>
      )}

      {events.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="label mb-2">Recent bot events</div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="text-xs muted">
                {e.event} · {e.actor ?? 'system'} · {dateTime(e.created_at)}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
