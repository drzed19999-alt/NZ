import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { touchCacheFromEvent } from '@/lib/investors';
import { evaluateTransactionEvent, evaluateKycEvent, evaluateCheckoutWaiting } from '@/lib/alerts';
import { getSetting } from '@/lib/settings';
import { platform } from '@/lib/crypto-platform/client';
import { rateLimit } from '@/lib/rate-limit';
import { getIp } from '@/lib/http';

export const dynamic = 'force-dynamic';

// ============================================================================
// Inbound webhooks FROM vtmarkets (the PUSH path for the live dashboard).
// vtmarkets signs each payload with HMAC-SHA256 using the shared secret.
// On each event we: refresh the investor snapshot cache, record it on the
// linked lead's timeline, and evaluate alert rules.
// ============================================================================

function verify(raw: string, header: string | null): boolean {
  const secret = env.webhooks.platformSecret;
  if (!secret) return true; // dev: no secret configured
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = getIp(req) ?? 'unknown';
  const rl = rateLimit(`platform-wh:${ip}`, { max: 600, windowMs: 60_000 });
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });

  const raw = await req.text();
  if (!verify(raw, req.headers.get('x-vt-signature'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const { event, data } = payload;
  const userId: string | undefined = data?.user_id;
  const admin = createAdminClient();

  try {
    // Find a linked lead (for timeline attribution), if any.
    let leadId: string | null = null;
    if (userId) {
      const { data: lead } = await admin
        .from('leads')
        .select('id')
        .eq('platform_user_id', userId)
        .maybeSingle();
      leadId = lead?.id ?? null;

      // Refresh the short-TTL snapshot cache so the dashboard reflects the event.
      await touchCacheFromEvent(userId);
    }

    // Merge the platform event into the lead timeline.
    if (leadId) {
      await admin.from('lead_history').insert({
        lead_id: leadId,
        type: `platform:${event}`,
        data: data ?? {},
      });
    }

    // Alert rules.
    if (event === 'transaction.created') {
      await evaluateTransactionEvent({
        user_id: userId!, type: data.type, amount: Number(data.amount), currency: data.currency,
      });

      // A card deposit holds the customer on the checkout processing screen.
      // Raise it regardless of amount, then honour the configured policy: either
      // leave them for an admin to route, or release them straight to history.
      const held = await evaluateCheckoutWaiting({
        user_id: userId!, type: data.type, status: data.status, method: data.method,
        amount: Number(data.amount), currency: data.currency, id: data.id,
      });

      if (held && data.id) {
        const mode = await getSetting<string>('checkout.redirect_mode');
        if (mode === 'auto_history') {
          // Goes through the integration API, never the platform DB directly.
          await platform
            .updateTransaction(data.id, { admin_redirect: 'history' })
            .catch((e: Error) => console.error('[platform webhook] auto-release failed:', e.message));
        }
      }
    } else if (event === 'kyc.updated') {
      await evaluateKycEvent({ user_id: userId!, status: data.status, level: data.level });
    }
  } catch (e) {
    console.error('[platform webhook] processing error:', (e as Error).message);
    // Still 200 so vtmarkets doesn't hammer retries for a transient CRM issue.
  }

  return NextResponse.json({ received: true });
}
