import 'server-only';
import { env, platformConfigured } from '@/lib/env';
import type {
  Account, FinancialSummary, InvestorSnapshot, KycInfo, PlatformActivityItem,
  PlatformStats, PlatformUser, PlatformUserListItem, Position, Transaction, PlatformPresence,
  BotConfig, BotEvent, PaymentMethod,
} from './types';

// ============================================================================
// vtmarkets crypto-platform connector.
//
// The CRM NEVER touches the vtmarkets database. Everything goes through this
// authenticated HTTP client against CRYPTO_PLATFORM_API_URL. If the platform
// is not configured, calls throw PlatformNotConfiguredError so the UI can show
// an honest "platform not connected" state instead of fabricating data.
// ============================================================================

export class PlatformNotConfiguredError extends Error {
  constructor() {
    super('Crypto platform integration is not configured (set CRYPTO_PLATFORM_API_URL and CRYPTO_PLATFORM_API_KEY).');
    this.name = 'PlatformNotConfiguredError';
  }
}

export class PlatformApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
    this.body = body;
  }
}

export function isPlatformConfigured(): boolean {
  return platformConfigured();
}

async function call<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  if (!platformConfigured()) throw new PlatformNotConfiguredError();

  const url = new URL(env.platform.url.replace(/\/$/, '') + '/api/integration/v1' + path);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.platform.apiKey}`,
      ...(init.headers ?? {}),
    },
    // Server-to-server; never cache authorized responses at the fetch layer.
    cache: 'no-store',
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new PlatformApiError(res.status, data?.error?.message ?? `Platform API ${res.status}`, data);
  }
  return data as T;
}

export const platform = {
  configured: isPlatformConfigured,

  // --- reads ---
  listUsers(params: {
    search?: string; status?: string; kyc?: string; source?: string;
    sort?: string; limit?: number; offset?: number;
  }): Promise<{ users: PlatformUserListItem[]; paging: { limit: number; offset: number; total: number } }> {
    return call('/users', { query: params });
  },

  lookupByEmail(email: string): Promise<{ exists: boolean; user: PlatformUser | null }> {
    return call('/users/lookup', { query: { email } });
  },

  stats(): Promise<PlatformStats> {
    return call('/stats');
  },

  getSnapshot(id: string): Promise<InvestorSnapshot> {
    return call(`/users/${id}`);
  },

  getBalances(id: string): Promise<{ accounts: Account[]; summary: FinancialSummary }> {
    return call(`/users/${id}/balances`);
  },

  getTransactions(id: string, limit = 100): Promise<{ transactions: Transaction[] }> {
    return call(`/users/${id}/transactions`, { query: { limit } });
  },

  getPositions(id: string): Promise<{ positions: Position[] }> {
    return call(`/users/${id}/positions`);
  },

  getKyc(id: string): Promise<{ kyc: KycInfo }> {
    return call(`/users/${id}/kyc`);
  },

  getPresence(id: string): Promise<{ presence: PlatformPresence }> {
    return call(`/users/${id}/presence`);
  },

  getActivity(id: string): Promise<{ activity: PlatformActivityItem[] }> {
    return call(`/users/${id}/activity`);
  },

  // --- authorized actions ---
  createUser(payload: {
    email: string; first_name?: string; last_name?: string; phone?: string;
    country?: string; crm_lead_id: string; source?: string; source_campaign?: string;
    send_activation_email?: boolean;
    // Supply a password to activate the account immediately instead of emailing
    // an activation link.
    password?: string; require_password_change?: boolean;
  }): Promise<{ user: PlatformUser; activation_url: string | null; login_url: string; activation_email: unknown }> {
    return call('/users', { method: 'POST', body: JSON.stringify(payload) });
  },

  setPassword(
    id: string,
    payload: { password: string; require_password_change?: boolean }
  ): Promise<{ user: PlatformUser; login_url: string }> {
    return call(`/users/${id}/set-password`, { method: 'POST', body: JSON.stringify(payload) });
  },

  linkUser(id: string, crm_lead_id: string): Promise<{ user: PlatformUser }> {
    return call(`/users/${id}/link`, { method: 'POST', body: JSON.stringify({ crm_lead_id }) });
  },

  sendActivation(id: string): Promise<{ sent: boolean; activation_url: string }> {
    return call(`/users/${id}/send-activation`, { method: 'POST', body: '{}' });
  },

  setStatus(id: string, status: string, reason?: string): Promise<{ user: PlatformUser }> {
    return call(`/users/${id}/status`, { method: 'POST', body: JSON.stringify({ status, reason }) });
  },

  // --- admin edit powers (all authorized + audited on the platform side) ---
  updateUser(
    id: string,
    patch: { first_name?: string; last_name?: string; phone?: string; country?: string; email?: string }
  ): Promise<{ user: PlatformUser }> {
    return call(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  setKyc(
    id: string,
    payload: { level: number; status: string; reviewer_note?: string }
  ): Promise<{ kyc: KycInfo }> {
    return call(`/users/${id}/kyc`, { method: 'POST', body: JSON.stringify(payload) });
  },

  adjustBalance(
    id: string,
    payload: { account_type?: string; amount: number; direction: 'credit' | 'debit'; currency?: string; reason?: string }
  ): Promise<{ account: Account; transaction: Transaction }> {
    return call(`/users/${id}/balance`, { method: 'POST', body: JSON.stringify(payload) });
  },

  setBalance(
    id: string,
    payload: { account_type?: string; target: number; currency?: string; reason?: string }
  ): Promise<{ account: Account; transaction: Transaction | null }> {
    return call(`/users/${id}/set-balance`, { method: 'POST', body: JSON.stringify(payload) });
  },

  // --- full admin control ---------------------------------------------------

  createTransaction(
    id: string,
    payload: {
      type: string; status?: string; amount: number; currency?: string; asset?: string;
      method?: string; reference?: string; note?: string;
      apply_to_balance?: boolean; account_type?: string;
    }
  ): Promise<{ transaction: Transaction; account: Account | null }> {
    return call(`/users/${id}/transactions`, { method: 'POST', body: JSON.stringify(payload) });
  },

  updateTransaction(
    txnId: string,
    payload: { status?: string; note?: string; reference?: string; admin_redirect?: 'history' | 'checkout' }
  ): Promise<{ transaction: Transaction }> {
    return call(`/transactions/${txnId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  /** Cancels the original and books a mirrored adjustment — never deletes. */
  reverseTransaction(txnId: string, reason?: string): Promise<{ reversed: Transaction; adjustment: Transaction }> {
    return call(`/transactions/${txnId}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  openPosition(
    id: string,
    payload: { symbol: string; side?: 'long' | 'short'; size: number; entry_price: number; mark_price?: number }
  ): Promise<{ position: Position }> {
    return call(`/users/${id}/positions`, { method: 'POST', body: JSON.stringify(payload) });
  },

  closePosition(posId: string, pnl?: number): Promise<{ position: Position }> {
    return call(`/positions/${posId}/close`, { method: 'POST', body: JSON.stringify({ pnl }) });
  },

  /** Soft close — reversible; the account row survives. */
  closeAccount(id: string, reason?: string): Promise<{ user: PlatformUser }> {
    return call(`/users/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  /** Irreversible. The platform demands the email back as confirmation. */
  deleteAccount(id: string, confirmEmail: string): Promise<{ deleted: boolean; id: string }> {
    return call(`/users/${id}`, { method: 'DELETE', body: JSON.stringify({ confirm_email: confirmEmail }) });
  },

  listPaymentMethods(id: string): Promise<{ payment_methods: PaymentMethod[] }> {
    return call(`/users/${id}/payment-methods`);
  },

  addPaymentMethod(
    id: string,
    payload: { kind: 'card' | 'bank' | 'crypto'; label: string; masked: string; holder?: string; detail?: string; is_default?: boolean; verified?: boolean }
  ): Promise<{ payment_method: PaymentMethod }> {
    return call(`/users/${id}/payment-methods`, { method: 'POST', body: JSON.stringify(payload) });
  },

  deletePaymentMethod(methodId: string): Promise<{ deleted: boolean }> {
    return call(`/payment-methods/${methodId}`, { method: 'DELETE' });
  },

  getBot(id: string): Promise<{ bot: BotConfig; events: BotEvent[] }> {
    return call(`/users/${id}/bot`);
  },

  updateBot(id: string, payload: Partial<BotConfig> & { actor?: string }): Promise<{ bot: BotConfig }> {
    return call(`/users/${id}/bot`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
};
