'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { money, dateTime, timeAgo, presenceLabel } from '@/lib/format';
import { can, type Role } from '@/lib/rbac';
import {
  BackLink, Button, Checkbox, Field, Notice, PageHeader, PageLoader, Panel, Pill,
  PresenceDot, Select, StatGrid, StatusBadge, TextInput, TimelineItem, type StatItem,
} from '@/components/ui';
import {
  BotPanel, DangerZone, PaymentMethodsPanel, PositionsPanel, TransactionsPanel,
} from '@/components/investor';

const KYC_STATUSES = ['none', 'pending', 'verified', 'rejected'];
const KYC_TIERS = [0, 1, 2, 3].map((l) => ({ value: l, label: `Tier ${l}` }));
const ACCOUNT_TYPES = ['spot', 'futures', 'funding'];
const DIRECTIONS = [{ value: 'credit', label: 'Credit (+)' }, { value: 'debit', label: 'Debit (−)' }];

/** Readable but strong temporary password. */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  buf.forEach((n) => (out += chars[n % chars.length]));
  return out + '!7';
}

export default function InvestorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      const res = await api.get(`/api/investors/${id}${refresh ? '?refresh=1' : ''}`);
      setData(res);
    } catch (e: any) { setErr(e.message); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (err) return <Notice tone="error" className="p-6">{err}</Notice>;
  if (!data) return <PageLoader label="Loading live investor data" />;

  const s = data.snapshot;
  const u = s.user;

  async function action(body: any) {
    setBusy(true); setErr(null);
    try { await api.post(`/api/investors/${id}/action`, body); await load(true); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const tiles: StatItem[] = [
    { label: 'Total balance', value: money(s.financials.total_balance, s.financials.currency) },
    { label: 'Total deposited', value: money(s.financials.total_deposited) },
    { label: 'Total withdrawn', value: money(s.financials.total_withdrawn) },
    { label: 'Account status', node: <StatusBadge status={s.account_status} /> },
    { label: 'KYC', node: <StatusBadge status={s.kyc.status} /> },
  ];

  return (
    <div className="space-y-4 animate-in">
      <BackLink href="/investors">Back to investors</BackLink>

      <PageHeader
        align="start"
        title={u.full_name || u.email}
        subtitle={<>
          {u.email} · <PresenceDot online={s.presence.online} />{presenceLabel(s.presence)} · joined {dateTime(u.created_at)}
          {data.lead && (
            <div className="text-xs mt-1">
              From CRM lead <Link href={`/leads/${data.lead.id}`} style={{ color: 'var(--gold-soft)' }}>#{data.lead.id.slice(0, 8)}</Link>
              {data.lead.assignee && ` · rep ${data.lead.assignee.full_name || data.lead.assignee.email}`}
            </div>
          )}
        </>}
        actions={<>
          <Button onClick={() => load(true)} disabled={busy}>↻ Refresh</Button>
          <Button onClick={() => action({ action: 'send_activation' })} disabled={busy}>Resend activation</Button>
          {u.status !== 'suspended'
            ? <Button disabled={busy}
                onClick={() => action({ action: 'set_status', status: 'suspended', reason: 'CRM admin action' })}>
                Suspend
              </Button>
            : <Button disabled={busy} onClick={() => action({ action: 'set_status', status: 'active' })}>
                Reactivate
              </Button>}
        </>}
      />

      <div className="muted text-xs">Live snapshot · fetched {timeAgo(data.fetched_at)}</div>

      <StatGrid items={tiles} cols={5} />

      <AdminControls id={id} role={data.viewer_role} user={u} kyc={s.kyc} onDone={() => load(true)} />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Balances + positions */}
        <div className="space-y-4">
          <Panel title="Balances">
            <table className="w-full">
              <tbody>
                {data.balances.accounts.map((a: any) => (
                  <tr key={a.id}>
                    <td className="td capitalize">{a.type}</td>
                    <td className="td text-right">{money(a.balance, a.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <PositionsPanel
            id={id} role={data.viewer_role} positions={data.positions} onDone={() => load(true)}
          />

          <TransactionsPanel
            id={id} role={data.viewer_role} transactions={data.transactions} onDone={() => load(true)}
          />

          <PaymentMethodsPanel
            id={id} role={data.viewer_role} methods={data.payment_methods || []} onDone={() => load(true)}
          />

          <BotPanel
            id={id} role={data.viewer_role} bot={data.bot} events={data.bot_events || []} onDone={() => load(true)}
          />

          <DangerZone id={id} role={data.viewer_role} user={u} />
        </div>

        {/* Unified timeline */}
        <Panel title="Unified timeline"
          description="CRM history + platform activity + transactions, merged.">
          <div className="space-y-1 max-h-[560px] overflow-y-auto pr-1">
            {data.timeline.map((e: any, i: number) => (
              <TimelineItem
                key={i}
                title={<>
                  <Pill tone={e.kind === 'crm' ? 'violet' : e.kind === 'transaction' ? 'pos' : 'info'}>{e.kind}</Pill>
                  {String(e.type).replace(/_/g, ' ')}
                </>}
                meta={<>
                  {e.actor ? `${e.actor} · ` : ''}{dateTime(e.at)}
                  {e.data?.amount ? ` · ${money(e.data.amount, e.data.currency)}` : ''}
                </>}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// Gated admin controls: edit profile/email, override KYC, credit/debit balance.
// Rendered only for roles that hold the permission; the server re-checks anyway.
function AdminControls({ id, role, user, kyc, onDone }: { id: string; role: Role; user: any; kyc: any; onDone: () => void }) {
  const canEdit = can(role, 'investor.edit');
  const canFunds = can(role, 'investor.funds');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState({
    first_name: user.first_name ?? '', last_name: user.last_name ?? '',
    email: user.email ?? '', phone: user.phone ?? '', country: user.country ?? '',
  });
  const [kycForm, setKycForm] = useState({ level: kyc.level ?? 0, status: kyc.status ?? 'none', reviewer_note: '' });
  const [bal, setBal] = useState({ account_type: 'spot', direction: 'credit', amount: '', reason: '' });
  const [pw, setPw] = useState({ password: '', require_password_change: true });

  if (!canEdit && !canFunds) return null;

  async function run(body: any, okMsg: string) {
    setBusy(true); setMsg(null);
    try { await api.post(`/api/investors/${id}/action`, body); setMsg(okMsg); onDone(); }
    catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Panel title="Admin controls" action={msg && <span className="text-xs muted">{msg}</span>}>
      <div className="grid md:grid-cols-3 gap-4">
        {canEdit && (
          <Field label="Edit profile" className="space-y-2">
            <div className="flex gap-2">
              <TextInput placeholder="First" value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
              <TextInput placeholder="Last" value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
            </div>
            <TextInput placeholder="Email" value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <TextInput placeholder="Phone" value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <TextInput placeholder="Country" value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
            <Button variant="primary" full disabled={busy}
              onClick={() => run({ action: 'edit_profile', profile }, 'Profile updated')}>Save profile</Button>
          </Field>
        )}

        {canEdit && (
          <Field label="KYC override" className="space-y-2">
            <Select options={KYC_STATUSES} value={kycForm.status}
              onChange={(e) => setKycForm({ ...kycForm, status: e.target.value })} />
            <Select options={KYC_TIERS} value={kycForm.level}
              onChange={(e) => setKycForm({ ...kycForm, level: Number(e.target.value) })} />
            <TextInput placeholder="Reviewer note (optional)" value={kycForm.reviewer_note}
              onChange={(e) => setKycForm({ ...kycForm, reviewer_note: e.target.value })} />
            <Button variant="primary" full disabled={busy}
              onClick={() => run({ action: 'set_kyc', kyc: kycForm }, 'KYC updated')}>Set KYC</Button>
          </Field>
        )}

        {canEdit && (
          <Field label="Set / reset password" className="space-y-2"
            hint="Stored hashed only. Copy it before leaving this page.">
            <div className="flex gap-2">
              <TextInput placeholder="New password" value={pw.password}
                onChange={(e) => setPw({ ...pw, password: e.target.value })} />
              <Button className="whitespace-nowrap"
                onClick={() => setPw({ ...pw, password: generatePassword() })}>Gen</Button>
            </div>
            <Checkbox
              checked={pw.require_password_change}
              onChange={(e) => setPw({ ...pw, require_password_change: e.target.checked })}
              label="Force change on next login"
            />
            <Button variant="primary" full disabled={busy || pw.password.length < 8}
              onClick={() => run({ action: 'set_password', credentials: pw }, `Password set — copy it now: ${pw.password}`)}>
              Set password
            </Button>
          </Field>
        )}

        {canFunds && (
          <Field label="Adjust balance" className="space-y-2">
            <Select options={ACCOUNT_TYPES} value={bal.account_type}
              onChange={(e) => setBal({ ...bal, account_type: e.target.value })} />
            <Select options={DIRECTIONS} value={bal.direction}
              onChange={(e) => setBal({ ...bal, direction: e.target.value })} />
            <TextInput type="number" placeholder="Amount" value={bal.amount}
              onChange={(e) => setBal({ ...bal, amount: e.target.value })} />
            <TextInput placeholder="Reason (audited)" value={bal.reason}
              onChange={(e) => setBal({ ...bal, reason: e.target.value })} />
            <Button variant="primary" full disabled={busy || !bal.amount}
              onClick={() => run({
                action: 'adjust_balance',
                balance: {
                  account_type: bal.account_type, direction: bal.direction,
                  amount: Number(bal.amount), reason: bal.reason,
                },
              }, 'Balance adjusted')}>
              Apply adjustment
            </Button>
          </Field>
        )}
      </div>
    </Panel>
  );
}
