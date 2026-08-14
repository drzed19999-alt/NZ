import { requirePermission } from '@/lib/auth';
import { handleError, ok, getIp } from '@/lib/http';
import { sendEmailSchema } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import { recordLeadHistory } from '@/lib/leads';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/email — send an email to a lead/user from the CRM.
// Optional ?lead_id= associates the email with a lead's timeline.
export async function POST(req: Request) {
  try {
    const admin = await requirePermission('email.send');
    const input = sendEmailSchema.parse(await req.json());
    const leadId = new URL(req.url).searchParams.get('lead_id');

    const html = `<div style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${input.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</div>`;

    const result = await sendEmail({ to: input.to, subject: input.subject, html, text: input.body });

    if (leadId) {
      await recordLeadHistory(leadId, admin.id, 'email_sent', {
        to: input.to, subject: input.subject, delivered: result.delivered,
      });
    }
    await audit(admin, 'email.send', {
      entityType: leadId ? 'lead' : 'email', entityId: leadId ?? input.to,
      data: { to: input.to, subject: input.subject, delivered: result.delivered }, ip: getIp(req),
    });

    return ok({ sent: true, delivered: result.delivered });
  } catch (e) {
    return handleError(e);
  }
}
