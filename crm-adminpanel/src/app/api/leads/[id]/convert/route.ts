import { requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleError, ok, err, getIp } from '@/lib/http';
import { convertSchema } from '@/lib/validation';
import { platform, PlatformApiError } from '@/lib/crypto-platform/client';
import { recordLeadHistory } from '@/lib/leads';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/leads/:id/convert
// Turn a CRM lead into a vtmarkets platform user (create OR link), detecting
// duplicates and recording the link both sides.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requirePermission('lead.convert');
    const input = convertSchema.parse(await req.json().catch(() => ({})));
    const supabase = createClient();

    const { data: lead, error: leadErr } = await supabase.from('leads').select('*').eq('id', params.id).single();
    if (leadErr || !lead) return err(404, 'not_found', 'Lead not found');
    if (lead.platform_user_id) return err(409, 'already_converted', 'Lead is already linked to a platform user');
    if (!lead.email) return err(400, 'missing_email', 'Lead needs an email before conversion');

    let platformUser;
    let activationUrl: string | null | undefined;
    let loginUrl: string | undefined;

    if (input.link_to_user_id) {
      // Explicitly link to an existing platform user.
      const res = await platform.linkUser(input.link_to_user_id, lead.id);
      platformUser = res.user;
    } else {
      // Detect an existing user by email first (dedupe).
      const lookup = await platform.lookupByEmail(lead.email);
      if (lookup.exists && lookup.user) {
        const res = await platform.linkUser(lookup.user.id, lead.id);
        platformUser = res.user;
      } else {
        try {
          const [first, ...rest] = (lead.full_name ?? '').split(' ');
          const res = await platform.createUser({
            email: lead.email,
            first_name: first || undefined,
            last_name: rest.join(' ') || undefined,
            phone: lead.phone ?? undefined,
            country: lead.country ?? undefined,
            crm_lead_id: lead.id,
            source: lead.source,
            source_campaign: lead.meta_campaign ?? undefined,
            send_activation_email: input.send_activation_email,
            password: input.password,
            require_password_change: input.require_password_change,
          });
          platformUser = res.user;
          activationUrl = res.activation_url;
          loginUrl = res.login_url;
        } catch (e) {
          // Race: user created between lookup and create -> link instead.
          if (e instanceof PlatformApiError && e.status === 409) {
            const existing = (e.body as any)?.error?.details?.user;
            if (existing?.id) {
              const res = await platform.linkUser(existing.id, lead.id);
              platformUser = res.user;
            } else throw e;
          } else throw e;
        }
      }
    }

    // Record the link on the CRM side (service role: this crosses the
    // converted-status transition and must always persist).
    //
    // The link itself is a fact and is always written. The pipeline status is
    // not: creating an account no longer implies the lead is converted, so the
    // stage only moves when the caller explicitly asks.
    const adminDb = createAdminClient();
    const patch: Record<string, unknown> = { platform_user_id: platformUser.id };
    if (input.mark_converted) {
      patch.status = 'converted';
      patch.converted_at = new Date().toISOString();
    }
    await adminDb.from('leads').update(patch).eq('id', lead.id);

    // Name the event for what actually happened — logging 'converted' when the
    // pipeline stage never moved would make the timeline lie.
    await recordLeadHistory(lead.id, admin.id, input.mark_converted ? 'converted' : 'platform_account_created', {
      platform_user_id: platformUser.id,
      linked: Boolean(input.link_to_user_id),
      marked_converted: input.mark_converted,
    });
    await audit(admin, 'lead.convert', {
      entityType: 'lead', entityId: lead.id,
      // Never log the password itself — only that one was set.
      data: { platform_user_id: platformUser.id, password_set: Boolean(input.password) },
      ip: getIp(req),
    });

    return ok(
      { platform_user: platformUser, activation_url: activationUrl, login_url: loginUrl },
      { status: 201 }
    );
  } catch (e) {
    return handleError(e);
  }
}
