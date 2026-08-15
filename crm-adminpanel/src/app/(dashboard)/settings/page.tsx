'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Button, CodeBlock, ConfiguredPill, Field, Notice, PageHeader, PageLoader, Panel, Select, TextInput,
} from '@/components/ui';

interface EffectiveSetting {
  key: string;
  label: string;
  help: string;
  type: 'number' | 'select';
  options?: { value: string; label: string }[];
  value: number | string;
  source: 'db' | 'env';
}

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/api/settings');
      setData(res);
      const d: Record<string, string> = {};
      res.settings.forEach((s: EffectiveSetting) => (d[s.key] = String(s.value)));
      setDrafts(d);
    } catch (e: any) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(key: string, value: string | null) {
    setSavingKey(key); setErr(null);
    try { await api.patch('/api/settings', { key, value }); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setSavingKey(null); }
  }

  if (err && !data) return <Notice tone="error" className="p-6">{err}</Notice>;
  if (!data) return <PageLoader label="Loading settings" />;

  const integrations = [
    {
      label: 'Crypto platform (vtmarkets) API',
      on: data.integrations.platform,
      detail: data.integrations.platform_url || 'Set CRYPTO_PLATFORM_API_URL + CRYPTO_PLATFORM_API_KEY',
    },
    {
      label: 'Meta Lead Ads',
      on: data.integrations.meta,
      detail: data.integrations.meta ? 'Page token + verify token set' : 'Manual leads work without Meta',
    },
    {
      label: 'Email (SMTP)',
      on: data.integrations.smtp,
      detail: data.integrations.smtp ? 'SMTP configured' : 'Emails are logged until SMTP is set',
    },
  ];

  return (
    <div className="space-y-4 max-w-3xl animate-in">
      <PageHeader title="Settings & integrations" />
      <Notice tone="error">{err}</Notice>

      {/* Editable, non-secret config (stored in DB, falls back to env) */}
      <Panel padding="p-5" title="Operational settings"
        description="Edited live and stored in the database — no redeploy. Each value falls back to its env var when unset.">
        <div className="space-y-4">
          {data.settings.map((s: EffectiveSetting) => (
            <div key={s.key} className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="muted text-xs">{s.help}</div>
                <code className="muted text-[11px]">{s.key} · source: {s.source}</code>
              </div>
              {s.type === 'select' ? (
                <Select className="max-w-[300px]" options={s.options ?? []} value={drafts[s.key] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} />
              ) : (
                <TextInput className="max-w-[140px]" type="number" value={drafts[s.key] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} />
              )}
              <Button variant="primary" busy={savingKey === s.key} busyLabel="Saving…"
                disabled={drafts[s.key] === String(s.value)}
                onClick={() => save(s.key, drafts[s.key])}>Save</Button>
              {s.source === 'db' && (
                <Button className="text-xs" onClick={() => save(s.key, null)} title="Revert to env default">
                  Reset
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Integration status (read-only) */}
      <Panel padding="p-5" title="Integration status">
        {integrations.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="font-medium">{r.label}</div>
              <div className="muted text-xs mt-0.5">{r.detail}</div>
            </div>
            <ConfiguredPill on={r.on} />
          </div>
        ))}
      </Panel>

      {/* Secrets — env only, status shown, values never exposed */}
      <Panel padding="p-5" title="Secrets"
        description={<>
          Managed via environment variables / your host&apos;s secret store — <b>not editable from the UI by design</b>.
          Storing keys, tokens, and DB credentials in the database would expose them in any backup or read of the DB.
        </>}>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.secrets).map(([k, on]) => (
            <div key={k} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--inset)' }}>
              <code className="text-xs">{k}</code>
              <ConfiguredPill on={on as boolean} />
            </div>
          ))}
        </div>
      </Panel>

      {/* Webhook endpoints */}
      <Panel padding="p-5" title="Webhook endpoints">
        <div className="space-y-3">
          <Field label="Meta leadgen callback URL">
            <CodeBlock>{data.webhooks.meta_url}</CodeBlock>
          </Field>
          <Field label="vtmarkets → CRM events (set as CRM_WEBHOOK_URL on the platform)">
            <CodeBlock>{data.webhooks.platform_url}</CodeBlock>
          </Field>
        </div>
      </Panel>
    </div>
  );
}
