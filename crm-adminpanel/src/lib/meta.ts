import 'server-only';
import crypto from 'crypto';
import { env } from '@/lib/env';

// ============================================================================
// Meta (Facebook) Lead Ads integration.
//
// Flow: Meta Ad -> Lead Form -> leadgen webhook -> we fetch the lead's field
// data from the Graph API -> insert into the CRM. Entirely optional: if Meta
// env vars are absent, the webhook still verifies but ingestion is skipped and
// manual leads continue to work.
// ============================================================================

/** Verify the webhook subscription handshake (GET). */
export function verifySubscription(params: URLSearchParams): string | null {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (mode === 'subscribe' && token && token === env.meta.verifyToken) {
    return challenge ?? '';
  }
  return null;
}

/** Validate the X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!env.meta.appSecret) return true; // no secret configured -> skip (dev)
  if (!signatureHeader) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', env.meta.appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface NormalizedMetaLead {
  meta_lead_id: string;
  meta_form_id?: string;
  meta_form_name?: string;
  meta_campaign?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  raw: Record<string, unknown>;
}

/**
 * Fetch a single lead's field_data from the Graph API and normalize it.
 * Returns null if Meta isn't configured (caller should skip ingestion).
 */
export async function fetchLead(leadgenId: string): Promise<NormalizedMetaLead | null> {
  if (!env.meta.pageAccessToken) return null;

  const url =
    `https://graph.facebook.com/${env.meta.graphVersion}/${leadgenId}` +
    `?access_token=${encodeURIComponent(env.meta.pageAccessToken)}` +
    `&fields=id,created_time,field_data,form_id,campaign_name,ad_id`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Meta Graph API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();

  const fields: Record<string, string> = {};
  for (const f of data.field_data ?? []) {
    fields[String(f.name).toLowerCase()] = Array.isArray(f.values) ? f.values[0] : f.values;
  }

  const fullName =
    fields['full_name'] ||
    [fields['first_name'], fields['last_name']].filter(Boolean).join(' ') ||
    undefined;

  return {
    meta_lead_id: String(data.id),
    meta_form_id: data.form_id ? String(data.form_id) : undefined,
    meta_form_name: data.form_name ? String(data.form_name) : undefined,
    meta_campaign: data.campaign_name ? String(data.campaign_name) : undefined,
    full_name: fullName,
    email: fields['email'],
    phone: fields['phone_number'] || fields['phone'],
    country: fields['country'] || fields['city'],
    raw: data,
  };
}

/** Parse leadgen ids out of a webhook body. */
export function extractLeadgenIds(body: any): string[] {
  const ids: string[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change.field === 'leadgen' && change.value?.leadgen_id) {
        ids.push(String(change.value.leadgen_id));
      }
    }
  }
  return ids;
}
