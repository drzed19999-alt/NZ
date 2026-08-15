import { requirePermission } from '@/lib/auth';
import { handleError, ok, err, getIp } from '@/lib/http';
import { env, platformConfigured } from '@/lib/env';
import { getEffectiveSettings, setSetting, clearSetting, isEditableKey, optionsFor } from '@/lib/settings';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/settings — effective (non-secret) settings + integration status.
// Secrets are never returned; only booleans indicating whether they're set.
export async function GET() {
  try {
    await requirePermission('settings.manage');
    const settings = await getEffectiveSettings();
    return ok({
      settings,
      integrations: {
        platform: platformConfigured(),
        platform_url: env.platform.url || null,
        meta: env.meta.configured,
        smtp: Boolean(env.smtp.host && env.smtp.user),
      },
      secrets: {
        // status only — values are never exposed
        SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        CRYPTO_PLATFORM_API_KEY: Boolean(process.env.CRYPTO_PLATFORM_API_KEY),
        PLATFORM_WEBHOOK_SECRET: Boolean(process.env.PLATFORM_WEBHOOK_SECRET),
        META_APP_SECRET: Boolean(process.env.META_APP_SECRET),
        META_PAGE_ACCESS_TOKEN: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
        SMTP_PASS: Boolean(process.env.SMTP_PASS),
      },
      webhooks: {
        meta_url: `${env.app.url}/api/webhooks/meta`,
        platform_url: `${env.app.url}/api/webhooks/platform`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

// PATCH /api/settings — update or reset a non-secret setting.
// Body: { key, value }  (value null → reset to env default)
export async function PATCH(req: Request) {
  try {
    const actor = await requirePermission('settings.manage');
    const { key, value } = await req.json();

    if (!isEditableKey(key)) {
      return err(400, 'bad_request', `"${key}" is not an editable setting. Secrets are managed via env only.`);
    }

    if (value === null || value === undefined || value === '') {
      await clearSetting(key);
      await audit(actor, 'settings.reset', { entityType: 'setting', entityId: key, ip: getIp(req) });
      return ok({ key, reset: true });
    }

    // Choice settings validate against their own option list; everything else is
    // still a non-negative number.
    const options = optionsFor(key);
    if (options) {
      const picked = String(value);
      if (!options.some((o) => o.value === picked)) {
        return err(400, 'validation', `Value must be one of: ${options.map((o) => o.value).join(', ')}.`);
      }
      await setSetting(key, picked);
      await audit(actor, 'settings.update', { entityType: 'setting', entityId: key, data: { value: picked }, ip: getIp(req) });
      return ok({ key, value: picked });
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      return err(400, 'validation', 'Value must be a non-negative number.');
    }

    await setSetting(key, num);
    await audit(actor, 'settings.update', { entityType: 'setting', entityId: key, data: { value: num }, ip: getIp(req) });
    return ok({ key, value: num });
  } catch (e) {
    return handleError(e);
  }
}
