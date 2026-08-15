// Types describing the vtmarkets integration API contract. These mirror the
// shapes returned by vtmarkets/server/src/routes/integration.routes.js.

export interface PlatformPresence {
  online: boolean;
  last_active_at: string | null;
  last_login_at: string | null;
  signal: 'last_active';
  window_minutes: number;
}

export interface PlatformUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  status: 'pending' | 'active' | 'restricted' | 'suspended' | 'closed';
  role: string;
  source: string | null;
  source_campaign: string | null;
  crm_lead_id: string | null;
  activated_at: string | null;
  created_at: string;
}

export interface PlatformUserListItem extends PlatformUser {
  presence: PlatformPresence;
  kyc: { status: string; level: number };
  total_balance: number;
  total_deposited: number;
}

export interface FinancialSummary {
  total_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  currency: string;
}

export interface Account {
  id: string;
  type: string;
  currency: string;
  balance: number;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'adjustment';
  status: string;
  asset: string;
  amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  checkout_details: Record<string, string> | null;
  admin_redirect: 'history' | 'checkout' | null;
  created_at: string;
  completed_at: string | null;
}

export interface Position {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  mark_price: number | null;
  pnl: number;
  status: string;
  opened_at: string;
}

export interface KycInfo {
  level: number;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
}

export interface InvestorSnapshot {
  user: PlatformUser;
  presence: PlatformPresence;
  financials: FinancialSummary;
  kyc: KycInfo;
  open_positions: number;
  account_status: string;
}

export interface PlatformStats {
  total_users: number;
  active_users: number;
  online_now: number;
  kyc_pending: number;
  total_balance: number;
  total_deposited: number;
}

export interface PlatformActivityItem {
  event: string;
  data: Record<string, unknown>;
  created_at: string;
}

/** ProTrader Bot state, owned by the platform (table: bot_configs). */
export interface BotConfig {
  user_id: string;
  status: 'stopped' | 'running' | 'paused' | 'locked';
  strategy: 'conservative' | 'balanced' | 'aggressive';
  symbols: string[];
  max_position_size: number;
  daily_loss_limit: number;
  take_profit_pct: number;
  stop_loss_pct: number;
  leverage: number;
  /** Admin kill-switch. When false the customer cannot start the bot at all. */
  enabled_by_admin: boolean;
  admin_note: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export interface BotEvent {
  id: string;
  event: string;
  actor: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  kind: 'card' | 'bank' | 'crypto';
  label: string;
  masked: string;
  holder: string | null;
  detail: string | null;
  is_default: boolean;
  verified: boolean;
  created_at: string;
}
