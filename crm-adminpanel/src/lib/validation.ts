import { z } from 'zod';

export const leadStatusEnum = z.enum([
  'new', 'contacted', 'qualified', 'proposal', 'converted', 'lost', 'unresponsive',
]);

export const leadSourceEnum = z.enum(['meta', 'manual', 'import', 'referral', 'organic']);

export const createLeadSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  country: z.string().max(80).optional(),
  source: leadSourceEnum.default('manual'),
  status: leadStatusEnum.default('new'),
  assigned_to: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  meta_campaign: z.string().optional(),
}).refine((d) => d.email || d.phone || d.full_name, {
  message: 'A lead needs at least a name, email, or phone.',
});

export const updateLeadSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  status: leadStatusEnum.optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const noteSchema = z.object({
  body: z.string().min(1).max(5000),
});

export const followupSchema = z.object({
  title: z.string().min(1).max(300),
  due_at: z.string().datetime(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const convertSchema = z.object({
  // If linkToUserId is set, link the lead to that existing platform user.
  // Otherwise create a new platform user from the lead.
  link_to_user_id: z.string().optional(),
  send_activation_email: z.boolean().default(true),
  // Optional: set the login password directly (rep onboarding the client).
  password: z.string().min(8).optional(),
  require_password_change: z.boolean().default(true),
});

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
});

export const investorActionSchema = z.object({
  action: z.enum([
    'set_status', 'send_activation', 'edit_profile', 'set_kyc', 'adjust_balance', 'set_balance', 'set_password',
    // Full-control actions.
    'create_transaction', 'update_transaction', 'reverse_transaction',
    'open_position', 'close_position',
    'update_bot',
    'add_payment_method', 'delete_payment_method',
    'close_account', 'delete_account',
  ]),
  transaction: z
    .object({
      type: z.enum(['deposit', 'withdrawal', 'trade', 'fee', 'adjustment']),
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('completed'),
      amount: z.number().positive(),
      currency: z.string().default('CAD'),
      method: z.string().max(80).optional(),
      reference: z.string().max(200).optional(),
      note: z.string().max(500).optional(),
      // Whether the account balance moves with it.
      apply_to_balance: z.boolean().default(false),
      account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
    })
    .optional(),
  transaction_id: z.string().optional(),
  transaction_patch: z
    .object({
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
      note: z.string().max(500).optional(),
      reference: z.string().max(200).optional(),
      admin_redirect: z.enum(['history', 'checkout']).optional(),
    })
    .optional(),
  position: z
    .object({
      symbol: z.string().min(1).max(40),
      side: z.enum(['long', 'short']).default('long'),
      size: z.number().positive(),
      entry_price: z.number().positive(),
      mark_price: z.number().positive().optional(),
    })
    .optional(),
  position_id: z.string().optional(),
  pnl: z.number().optional(),
  bot: z
    .object({
      status: z.enum(['stopped', 'running', 'paused', 'locked']).optional(),
      strategy: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
      symbols: z.array(z.string().min(1).max(40)).optional(),
      max_position_size: z.number().min(0).optional(),
      daily_loss_limit: z.number().min(0).optional(),
      take_profit_pct: z.number().min(0).max(100).optional(),
      stop_loss_pct: z.number().min(0).max(100).optional(),
      leverage: z.number().int().min(1).max(125).optional(),
      enabled_by_admin: z.boolean().optional(),
      admin_note: z.string().max(500).optional(),
    })
    .optional(),
  payment_method: z
    .object({
      kind: z.enum(['card', 'bank', 'crypto']),
      label: z.string().min(1).max(120),
      masked: z.string().min(1).max(80),
      holder: z.string().max(120).optional(),
      detail: z.string().max(120).optional(),
      is_default: z.boolean().default(false),
      verified: z.boolean().default(false),
    })
    .optional(),
  payment_method_id: z.string().optional(),
  /** Must equal the account email — guards the irreversible delete. */
  confirm_email: z.string().optional(),
  status: z.enum(['active', 'restricted', 'suspended', 'closed']).optional(),
  reason: z.string().max(500).optional(),
  profile: z
    .object({
      first_name: z.string().max(120).optional(),
      last_name: z.string().max(120).optional(),
      phone: z.string().max(50).optional(),
      country: z.string().max(80).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  kyc: z
    .object({
      level: z.number().int().min(0).max(3),
      status: z.enum(['none', 'pending', 'verified', 'rejected']),
      reviewer_note: z.string().max(500).optional(),
    })
    .optional(),
  balance: z
    .object({
      account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
      amount: z.number().positive(),
      direction: z.enum(['credit', 'debit']),
      currency: z.string().default('CAD'),
      reason: z.string().max(500).optional(),
    })
    .optional(),
  target_balance: z
    .object({
      account_type: z.enum(['spot', 'futures', 'funding']).default('spot'),
      target: z.number().min(0),
      currency: z.string().default('CAD'),
      reason: z.string().max(500).optional(),
    })
    .optional(),
  credentials: z
    .object({
      password: z.string().min(8),
      require_password_change: z.boolean().default(true),
    })
    .optional(),
});

export const createAdminSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  role: z.enum(['owner', 'admin', 'manager', 'agent', 'viewer']),
  password: z.string().min(10).optional(),
});

export const updateAdminSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'agent', 'viewer']).optional(),
  active: z.boolean().optional(),
  full_name: z.string().min(1).max(200).optional(),
});
