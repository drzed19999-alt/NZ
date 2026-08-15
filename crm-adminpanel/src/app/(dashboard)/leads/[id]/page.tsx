'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { dateTime, timeAgo } from '@/lib/format';
import { generatePassword } from '@/lib/password';
import { can } from '@/lib/rbac';
import {
  BackLink, Button, ErrorText, Field, HistoryItem, InsetBox, Modal, Notice,
  PageHeader, PageLoader, Panel, Pill, RadioCard, Select, StatusBadge, TextArea, TextInput,
} from '@/components/ui';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost', 'unresponsive'];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const res = await api.get(`/api/leads/${id}`);
    setData(res);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
    api.get('/api/admins').then((r) => setAdmins(r.admins)).catch(() => {});
  }, [load]);

  if (!data) return <PageLoader label="Opening lead" />;
  const lead = data.lead;

  async function patch(patch: any) {
    await api.patch(`/api/leads/${id}`, patch);
    await load();
  }
  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    try { await api.post(`/api/leads/${id}/notes`, { body: note }); setNote(''); await load(); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 animate-in">
      <BackLink href="/leads">Back to leads</BackLink>

      <PageHeader
        align="start"
        title={lead.full_name || lead.email || 'Unnamed lead'}
        subtitle={<>
          {lead.email} {lead.phone && `· ${lead.phone}`} · <span className="capitalize">{lead.source}</span>
          {lead.meta_campaign && ` · ${lead.meta_campaign}`}
        </>}
        actions={<>
          {can(data.viewer_role, 'lead.delete') && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
          )}
          <Button onClick={() => setEmailOpen(true)} disabled={!lead.email}>Email</Button>
          {lead.platform_user_id ? (
            <Link className="btn-primary" href={`/investors/${lead.platform_user_id}`}>View investor →</Link>
          ) : (
            <Button variant="primary" onClick={() => setConvertOpen(true)} disabled={busy || !lead.email}>
              Convert to user
            </Button>
          )}
        </>}
      />

      <Notice>{msg}</Notice>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Left: properties */}
        <div className="space-y-4">
          <Panel className="space-y-3">
            <Field label="Status">
              <Select options={STATUSES} value={lead.status} onChange={(e) => patch({ status: e.target.value })} />
            </Field>
            <Field label="Assigned to">
              <Select
                placeholder="Unassigned"
                options={admins.map((a) => ({ value: a.id, label: a.full_name || a.email }))}
                value={lead.assigned_to ?? ''}
                onChange={(e) => patch({ assigned_to: e.target.value || null })}
              />
            </Field>
            <Field label="Tags (comma separated)">
              <TextInput
                defaultValue={(lead.tags || []).join(', ')}
                onBlur={(e) => patch({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              />
            </Field>
            <div className="pt-1">
              <StatusBadge status={lead.status} />
              {lead.platform_user_id && <Pill tone="pos" className="ml-2">Linked</Pill>}
            </div>
          </Panel>

          <FollowUps leadId={id} followups={data.followups} onChange={load} />
        </div>

        {/* Middle: notes */}
        <Panel title="Notes">
          <TextArea className="mb-2" rows={3} placeholder="Add a note…"
            value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="primary" className="mb-4" onClick={addNote} busy={busy}>Add note</Button>
          <div className="space-y-3">
            {data.notes.length === 0 && <div className="muted text-sm">No notes yet.</div>}
            {data.notes.map((n: any) => (
              <InsetBox key={n.id}>
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="muted text-xs mt-1">
                  {n.author?.full_name || n.author?.email || 'system'} · {timeAgo(n.created_at)}
                </div>
              </InsetBox>
            ))}
          </div>
        </Panel>

        {/* Right: history */}
        <Panel title="History">
          <div className="space-y-2">
            {data.history.map((h: any) => (
              <HistoryItem
                key={h.id}
                title={h.type.replace(/_/g, ' ').replace('platform:', '⚡ ')}
                meta={<>{h.actor?.full_name || h.actor?.email || 'system'} · {dateTime(h.created_at)}</>}
              />
            ))}
          </div>
        </Panel>
      </div>

      {deleteOpen && (
        <DeleteLeadModal
          leadId={id}
          name={lead.full_name || lead.email || 'this lead'}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push('/leads')}
        />
      )}

      {emailOpen && <EmailModal to={lead.email} leadId={id} onClose={() => setEmailOpen(false)} onSent={load} />}
      {convertOpen && (
        <ConvertModal leadId={id} email={lead.email} onClose={() => setConvertOpen(false)} onDone={load} />
      )}
    </div>
  );
}

// Two onboarding modes when turning a lead into a platform user.
function ConvertModal({ leadId, email, onClose, onDone }: any) {
  // Setting a password up front is the common case — reps hand over credentials
  // on the call. The activation-email route is the opt-in.
  const [mode, setMode] = useState<'email' | 'password'>('password');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const body: any = { send_activation_email: mode === 'email' };
      if (mode === 'password') {
        body.password = password;
        // The rep hands this password over as-is; the API defaults this to true,
        // so it has to be sent explicitly or the client gets prompted to change it.
        body.require_password_change = false;
      }
      const res = await api.post(`/api/leads/${leadId}/convert`, body);
      setDone(res);
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Account created"
        footer={<Button variant="primary" full onClick={onClose}>Done</Button>}>
        <p className="text-sm mb-3">
          Platform user <code>{done.platform_user.id.slice(0, 8)}</code> is linked to this lead.
        </p>
        {mode === 'password' ? (
          <InsetBox className="p-3 text-sm">
            <div className="muted text-xs mb-1">Give these credentials to the client:</div>
            <div><b>Login:</b> {done.login_url}</div>
            <div><b>Email:</b> {email}</div>
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
      title="Convert lead to platform user"
      subtitle={email}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit} busy={busy} busyLabel="Creating…"
          disabled={mode === 'password' && password.length < 8}>Create account</Button>
      </>}
    >
      <RadioCard
        className="mb-3"
        checked={mode === 'password'}
        onChange={() => setMode('password')}
        title="Set a password now"
        description="Account is active immediately — give the client their login details."
      />

      {mode === 'password' && (
        <div className="mb-3 pl-6 flex gap-2">
          <TextInput placeholder="At least 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <Button className="whitespace-nowrap" onClick={() => setPassword(generatePassword())}>Generate</Button>
        </div>
      )}

      <RadioCard
        className="mb-3"
        checked={mode === 'email'}
        onChange={() => setMode('email')}
        title="Send activation email"
        description="The client sets their own password via a secure link."
      />

      <ErrorText className="mt-3">{err}</ErrorText>
    </Modal>
  );
}

function FollowUps({ leadId, followups, onChange }: { leadId: string; followups: any[]; onChange: () => void }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  async function add() {
    if (!title || !due) return;
    await api.post(`/api/leads/${leadId}/followups`, { title, due_at: new Date(due).toISOString() });
    setTitle(''); setDue(''); onChange();
  }
  async function done(fid: string) {
    await api.patch(`/api/leads/${leadId}/followups?fid=${fid}`, {});
    onChange();
  }

  return (
    <Panel title="Follow-ups">
      <TextInput className="mb-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextInput className="mb-2" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      <Button variant="primary" className="mb-3" onClick={add}>Schedule</Button>
      <div className="space-y-2">
        {followups.map((f: any) => (
          <div key={f.id} className="flex items-center justify-between text-sm">
            <div className={f.done ? 'line-through muted' : ''}>
              {f.title}<div className="muted text-xs">{dateTime(f.due_at)}</div>
            </div>
            {!f.done && <Button className="text-xs" onClick={() => done(f.id)}>Done</Button>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EmailModal({ to, leadId, onClose, onSent }: any) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setSending(true); setErr(null);
    try { await api.post(`/api/email?lead_id=${leadId}`, { to, subject, body }); onSent(); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  }

  return (
    <Modal
      onClose={onClose}
      size="lg"
      title="Email lead"
      subtitle={`To: ${to}`}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={send} busy={sending} busyLabel="Sending…">Send</Button>
      </>}
    >
      <TextInput className="mb-3" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <TextArea className="mb-3" rows={6} placeholder="Message…" value={body} onChange={(e) => setBody(e.target.value)} />
      <ErrorText className="">{err}</ErrorText>
    </Modal>
  );
}

/** Deleting a lead removes its notes, follow-ups and history with it. */
function DeleteLeadModal({
  leadId, name, onClose, onDeleted,
}: { leadId: string; name: string; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true); setErr(null);
    try { await api.del(`/api/leads/${leadId}`); onDeleted(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal
      onClose={onClose}
      title="Delete this lead?"
      subtitle={name}
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={remove} busy={busy} busyLabel="Deleting…">Delete lead</Button>
      </>}
    >
      <p className="text-sm">
        The lead and all of its notes, follow-ups and history are removed. If it has already been converted,
        the platform user is <b>not</b> affected. This cannot be undone.
      </p>
      <ErrorText className="mt-3">{err}</ErrorText>
    </Modal>
  );
}
