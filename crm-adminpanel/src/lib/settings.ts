import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

// ============================================================================
// Runtime settings layer.
//
// NON-SECRET, operational config lives in the `integration_settings` table and
// is editable from the Settings UI (no redeploy needed). Each key falls back to
// its env var when not set in the DB. SECRETS are intentionally NOT here — they
// stay in env / the host secret store (see the Settings page for why).
// ============================================================================

export const EDITABLE_SETTINGS = {
  'alert.large_txn_threshold': {
    label: 'Large transaction alert threshold',
    help: 'Deposit/withdrawal at or above this amount raises an alert.',
    type: 'number' as const,
    fallback: () => env.alerts.largeTxnThreshold,
  },
  'alert.dormant_days': {
    label: 'Dormant investor (days)',
    help: 'Flag investors with no activity for this many days after converting.',
    type: 'number' as const,
    fallback: () => env.alerts.dormantDays,
  },
  'alert.kyc_sla_hours': {
    label: 'KYC SLA (hours)',
    help: 'Target time to review a KYC submission.',
    type: 'number' as const,
    fallback: () => env.alerts.kycSlaHours,
  },
  'investor.cache_ttl_seconds': {
    label: 'Investor cache TTL (seconds)',
    help: 'How long a live investor snapshot is cached before re-fetching.',
    type: 'number' as const,
    fallback: () => env.platform.cacheTtlSeconds,
  },
};

export type SettingKey = keyof typeof EDITABLE_SETTINGS;

export function isEditableKey(k: string): k is SettingKey {
  return Object.prototype.hasOwnProperty.call(EDITABLE_SETTINGS, k);
}

// Small in-process cache so hot paths (alert checks) don't hit the DB each time.
let cache: { at: number; values: Record<string, unknown> } | null = null;
const CACHE_TTL_MS = 15_000;

async function loadAll(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  const values: Record<string, unknown> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('integration_settings').select('key, value');
    for (const row of data ?? []) {
      values[(row as any).key] = ((row as any).value as any)?.v;
    }
  } catch {
    // fall back to env-only if the DB is unreachable
  }
  cache = { at: Date.now(), values };
  return values;
}

export function invalidateSettingsCache() {
  cache = null;
}

/** Effective value for a key: DB value if present, else the env fallback. */
export async function getSetting<T = unknown>(key: SettingKey): Promise<T> {
  const values = await loadAll();
  const v = values[key];
  if (v !== undefined && v !== null) return v as T;
  return EDITABLE_SETTINGS[key].fallback() as unknown as T;
}

export interface EffectiveSetting {
  key: SettingKey;
  label: string;
  help: string;
  type: 'number';
  value: unknown;
  source: 'db' | 'env';
}

export async function getEffectiveSettings(): Promise<EffectiveSetting[]> {
  const values = await loadAll();
  return (Object.keys(EDITABLE_SETTINGS) as SettingKey[]).map((key) => {
    const def = EDITABLE_SETTINGS[key];
    const hasDb = values[key] !== undefined && values[key] !== null;
    return {
      key,
      label: def.label,
      help: def.help,
      type: def.type,
      value: hasDb ? values[key] : def.fallback(),
      source: hasDb ? 'db' : 'env',
    };
  });
}

export async function setSetting(key: SettingKey, value: unknown): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('integration_settings')
    .upsert({ key, value: { v: value }, updated_at: new Date().toISOString() });
  invalidateSettingsCache();
}

/** Reset a key back to its env default by removing the DB override. */
export async function clearSetting(key: SettingKey): Promise<void> {
  const admin = createAdminClient();
  await admin.from('integration_settings').delete().eq('key', key);
  invalidateSettingsCache();
}
