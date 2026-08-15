// Centralized, typed access to environment variables.
// Server-only secrets are read lazily so importing this file in a client
// component never leaks them.

function req(name: string): string {
  const v = process.env[name];
  if (!v && process.env.NODE_ENV === 'production') {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return v ?? '';
}

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    get serviceRoleKey() {
      return req('SUPABASE_SERVICE_ROLE_KEY');
    },
  },
  platform: {
    url: process.env.CRYPTO_PLATFORM_API_URL ?? '',
    get apiKey() {
      return req('CRYPTO_PLATFORM_API_KEY');
    },
    cacheTtlSeconds: parseInt(process.env.INVESTOR_CACHE_TTL_SECONDS ?? '60', 10),
  },
  webhooks: {
    get platformSecret() {
      return process.env.PLATFORM_WEBHOOK_SECRET ?? '';
    },
  },
  meta: {
    get appSecret() {
      return process.env.META_APP_SECRET ?? '';
    },
    get verifyToken() {
      return process.env.META_VERIFY_TOKEN ?? '';
    },
    get pageAccessToken() {
      return process.env.META_PAGE_ACCESS_TOKEN ?? '';
    },
    graphVersion: process.env.META_GRAPH_VERSION ?? 'v20.0',
    get configured() {
      return Boolean(process.env.META_PAGE_ACCESS_TOKEN && process.env.META_VERIFY_TOKEN);
    },
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'VT Markets CRM <crm@vtmarkets.example>',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },
  alerts: {
    largeTxnThreshold: parseFloat(process.env.ALERT_LARGE_TXN_THRESHOLD ?? '25000'),
    dormantDays: parseInt(process.env.ALERT_DORMANT_DAYS ?? '14', 10),
    kycSlaHours: parseInt(process.env.ALERT_KYC_SLA_HOURS ?? '48', 10),
  },
  checkout: {
    // 'manual'       — hold the customer on the processing screen until an admin
    //                  picks a destination (the existing behaviour).
    // 'auto_history' — release them to deposit history as soon as the deposit is
    //                  recorded; no one has to be watching for it.
    redirectMode: process.env.CHECKOUT_REDIRECT_MODE === 'auto_history' ? 'auto_history' : 'manual',
  },
};

export function platformConfigured(): boolean {
  return Boolean(env.platform.url && process.env.CRYPTO_PLATFORM_API_KEY);
}
