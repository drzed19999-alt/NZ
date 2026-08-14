import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifySubscription, verifySignature, extractLeadgenIds, fetchLead } from '@/lib/meta';
import { rateLimit } from '@/lib/rate-limit';
import { getIp } from '@/lib/http';

export const dynamic = 'force-dynamic';

// GET — Meta subscription verification handshake.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = verifySubscription(url.searchParams);
  if (challenge !== null) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — leadgen events. Verifies the signature, fetches each lead's fields
// from the Graph API, and upserts into the CRM (deduped by meta_lead_id).
export async function POST(req: Request) {
  const ip = getIp(req) ?? 'unknown';
  const rl = rateLimit(`meta:${ip}`, { max: 120, windowMs: 60_000 });
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });

  const raw = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifySignature(raw, signature)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const leadgenIds = extractLeadgenIds(body);
  const admin = createAdminClient();
  let ingested = 0;

  for (const leadgenId of leadgenIds) {
    try {
      const normalized = await fetchLead(leadgenId);
      if (!normalized) {
        // Meta not fully configured (no page token). Still store a stub so the
        // lead isn't lost; it can be enriched later.
        await admin.from('leads').upsert(
          { source: 'meta', status: 'new', meta_lead_id: leadgenId, meta_raw: body },
          { onConflict: 'meta_lead_id' }
        );
        ingested += 1;
        continue;
      }

      const { data: lead, error } = await admin
        .from('leads')
        .upsert(
          {
            source: 'meta',
            status: 'new',
            full_name: normalized.full_name ?? null,
            email: normalized.email ?? null,
            phone: normalized.phone ?? null,
            country: normalized.country ?? null,
            meta_lead_id: normalized.meta_lead_id,
            meta_form_id: normalized.meta_form_id ?? null,
            meta_form_name: normalized.meta_form_name ?? null,
            meta_campaign: normalized.meta_campaign ?? null,
            meta_raw: normalized.raw,
          },
          { onConflict: 'meta_lead_id' }
        )
        .select('id')
        .single();

      if (!error && lead) {
        await admin.from('lead_history').insert({
          lead_id: lead.id, type: 'created', data: { via: 'meta', leadgen_id: leadgenId },
        });
        ingested += 1;
      }
    } catch (e) {
      console.error('[meta webhook] failed to ingest lead', leadgenId, (e as Error).message);
    }
  }

  // Meta expects a fast 200 to avoid retries.
  return NextResponse.json({ received: true, ingested });
}
