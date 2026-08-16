'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { money, dateTime, timeAgo, presenceLabel } from '@/lib/format';
import { generatePassword } from '@/lib/password';
import { can, type Role } from '@/lib/rbac';
import {
  BackLink, Button, Checkbox, Field, Notice, PageHeader, PageLoader, Panel, Pill,
  PresenceDot, Select, StatGrid, StatusBadge, TabPanel, Tabs, TextInput, TimelineItem,
  useToast, type StatItem, type TabItem,
} from '@/components/ui';
import {
  BotPanel, CheckoutWaitingBar, DangerZone, PaymentMethodsPanel, PositionsPanel, TransactionsPanel,
} from '@/components/investor';

const KYC_STATUSES = ['none', 'pending', 'verified', 'rejected'];
const KYC_TIERS = [0, 1, 2, 3].map((l) => ({ value: l, label: `Tier ${l}` }));
const ACCOUNT_TYPES = ['spot', 'futures', 'funding'];
const DIRECTIONS = [{ value: 'credit', label: 'Credit (+)' }, { value: 'debit', label: 'Debit (−)' }];

export default function InvestorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('overview');

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

  // Counts on the tabs so nothing important is hidden behind an unopened one.
  const openPositions = (data.positions ?? []).filter((p: any) => p.status === 'open').length;
  const heldDeposits = (data.transactions ?? []).filter(
    (t: any) => t.type === 'deposit'
      && (t.status === 'pending' || t.status === 'processing')
      && !t.admin_redirect
  ).length;

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'transactions',
      label: 'Transactions',
      badge: heldDeposits || (data.transactions ?? []).length || null,
      urgent: heldDeposits > 0,
    },
    { id: 'trading', label: 'Trading', badge: openPositions || null },
    { id: 'admin', label: 'Admin controls' },
    { id: 'timeline', label: 'Timeline' },
  ];

  const fin = data.balances?.summary ?? s.financials;
  const tiles: StatItem[] = [
    { label: 'Total balance', value: money(fin.total_balance, fin.currency) },
    { label: 'Total deposited', value: money(fin.total_deposited) },
    { label: 'Total withdrawn', value: money(fin.total_withdrawn) },
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
              CRM client <Link href={`/leads/${data.lead.id}`} style={{ color: 'var(--gold-soft)' }}>#{data.lead.id.slice(0, 8)}</Link>
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

      {/* Full width and above everything else: someone is on the checkout
          spinner waiting for this decision. */}
      <CheckoutWaitingBar
        id={id} role={data.viewer_role} transactions={data.transactions} onDone={() => load(true)}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <TabPanel id="overview" active={tab}>
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="Balances" description="Live from the platform — never cached as source of truth.">
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

          <PaymentMethodsPanel
            id={id} role={data.viewer_role} methods={data.payment_methods || []} onDone={() => load(true)}
          />
        </div>
      </TabPanel>

      <TabPanel id="transactions" active={tab}>
        <TransactionsPanel
          id={id} role={data.viewer_role} transactions={data.transactions} onDone={() => load(true)}
        />
      </TabPanel>

      <TabPanel id="trading" active={tab}>
        <div className="space-y-4">
          <PositionsPanel
            id={id} role={data.viewer_role} positions={data.positions} onDone={() => load(true)}
          />
          <BotPanel
            id={id} role={data.viewer_role} bot={data.bot} events={data.bot_events || []} onDone={() => load(true)}
          />
        </div>
      </TabPanel>

      <TabPanel id="admin" active={tab}>
        <div className="space-y-4">
          <AdminControls id={id} role={data.viewer_role} user={u} kyc={s.kyc} onDone={() => load(true)} />
          <DangerZone id={id} role={data.viewer_role} user={u} />
        </div>
      </TabPanel>

      <TabPanel id="timeline" active={tab}>
        <Panel title="Unified timeline"
          description="CRM history + platform activity + transactions, merged.">
          <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
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
      </TabPanel>
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
  const t = useToast();

  const [profile, setProfile] = useState({
    first_name: user.first_name ?? '', last_name: user.last_name ?? '',
    email: user.email ?? '', phone: user.phone ?? '', country: user.country ?? '',
  });
  const [kycForm, setKycForm] = useState({ level: kyc.level ?? 0, status: kyc.status ?? 'none', reviewer_note: '' });
  const [bal, setBal] = useState({ account_type: 'spot', direction: 'credit', amount: '', reason: '' });
  const [setBalForm, setSetBalForm] = useState({ account_type: 'spot', target: '', reason: '' });
  const [pw, setPw] = useState({ password: '', require_password_change: true });

  if (!canEdit && !canFunds) return null;

  async function run(body: any, okMsg: string) {
    setBusy(true); setMsg(null);
    try { await api.post(`/api/investors/${id}/action`, body); setMsg(okMsg); t.success('Done', okMsg); onDone(); }
    catch (e: any) { setMsg(e.message); t.error('Failed', e.message); }
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

        {canFunds && (
          <Field label="Set balance" className="space-y-2"
            hint="Set the exact balance. The system records an adjustment transaction for the difference.">
            <Select options={ACCOUNT_TYPES} value={setBalForm.account_type}
              onChange={(e) => setSetBalForm({ ...setBalForm, account_type: e.target.value })} />
            <TextInput type="number" placeholder="Target balance" value={setBalForm.target}
              onChange={(e) => setSetBalForm({ ...setBalForm, target: e.target.value })} />
            <TextInput placeholder="Reason (audited)" value={setBalForm.reason}
              onChange={(e) => setSetBalForm({ ...setBalForm, reason: e.target.value })} />
            <Button variant="primary" full disabled={busy || setBalForm.target === ''}
              onClick={() => run({
                action: 'set_balance',
                target_balance: {
                  account_type: setBalForm.account_type,
                  target: Number(setBalForm.target),
                  reason: setBalForm.reason,
                },
              }, `Balance set to ${setBalForm.target}`)}>
              Set balance
            </Button>
          </Field>
        )}
      </div>
    </Panel>
  );
}
