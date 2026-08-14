import { requireAdmin, AuthError } from '@/lib/auth';
import { can, type Permission } from '@/lib/rbac';
import { handleError, ok, err, getIp } from '@/lib/http';
import { investorActionSchema } from '@/lib/validation';
import { platform } from '@/lib/crypto-platform/client';
import { getInvestorSnapshot } from '@/lib/investors';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST /api/investors/:id/action — authorized administrative actions on the
// platform. Every action goes through vtmarkets' own business logic via the
// integration API — the CRM never mutates the platform DB directly. Each
// action requires a specific permission and is audited.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const input = investorActionSchema.parse(await req.json());

    const need = (p: Permission) => {
      if (!can(actor.role, p)) throw new AuthError(403, `Missing permission: ${p}`);
    };

    let result: unknown;
    switch (input.action) {
      case 'set_status':
        need('investor.action');
        if (!input.status) return err(400, 'bad_request', 'status is required for set_status');
        result = await platform.setStatus(params.id, input.status, input.reason);
        break;

      case 'send_activation':
        need('investor.action');
        result = await platform.sendActivation(params.id);
        break;

      case 'edit_profile':
        need('investor.edit');
        if (!input.profile) return err(400, 'bad_request', 'profile is required for edit_profile');
        result = await platform.updateUser(params.id, input.profile);
        break;

      case 'set_kyc':
        need('investor.edit');
        if (!input.kyc) return err(400, 'bad_request', 'kyc is required for set_kyc');
        result = await platform.setKyc(params.id, input.kyc);
        break;

      case 'adjust_balance':
        need('investor.funds');
        if (!input.balance) return err(400, 'bad_request', 'balance is required for adjust_balance');
        result = await platform.adjustBalance(params.id, input.balance);
        break;

      case 'set_password':
        need('investor.edit');
        if (!input.credentials) return err(400, 'bad_request', 'credentials is required for set_password');
        result = await platform.setPassword(params.id, input.credentials);
        break;

      // --- transactions -----------------------------------------------------
      case 'create_transaction':
        need('investor.txn');
        if (!input.transaction) return err(400, 'bad_request', 'transaction is required');
        result = await platform.createTransaction(params.id, input.transaction);
        break;

      case 'update_transaction':
        need('investor.txn');
        if (!input.transaction_id || !input.transaction_patch) {
          return err(400, 'bad_request', 'transaction_id and transaction_patch are required');
        }
        result = await platform.updateTransaction(input.transaction_id, input.transaction_patch);
        break;

      case 'reverse_transaction':
        need('investor.txn');
        if (!input.transaction_id) return err(400, 'bad_request', 'transaction_id is required');
        result = await platform.reverseTransaction(input.transaction_id, input.reason);
        break;

      // --- positions --------------------------------------------------------
      case 'open_position':
        need('investor.position');
        if (!input.position) return err(400, 'bad_request', 'position is required');
        result = await platform.openPosition(params.id, input.position);
        break;

      case 'close_position':
        need('investor.position');
        if (!input.position_id) return err(400, 'bad_request', 'position_id is required');
        result = await platform.closePosition(input.position_id, input.pnl);
        break;

      // --- ProTrader Bot ----------------------------------------------------
      case 'update_bot':
        need('investor.bot');
        if (!input.bot) return err(400, 'bad_request', 'bot is required');
        // Stamp who changed it so the platform's bot_events shows the CRM admin.
        result = await platform.updateBot(params.id, { ...input.bot, actor: `crm:${actor.email}` });
        break;

      // --- payment methods --------------------------------------------------
      case 'add_payment_method':
        need('investor.edit');
        if (!input.payment_method) return err(400, 'bad_request', 'payment_method is required');
        result = await platform.addPaymentMethod(params.id, input.payment_method);
        break;

      case 'delete_payment_method':
        need('investor.edit');
        if (!input.payment_method_id) return err(400, 'bad_request', 'payment_method_id is required');
        result = await platform.deletePaymentMethod(input.payment_method_id);
        break;

      // --- account lifecycle ------------------------------------------------
      case 'close_account':
        need('investor.action');
        result = await platform.closeAccount(params.id, input.reason);
        break;

      case 'delete_account':
        // Irreversible and cascades to every financial record — owner only, and
        // the typed email must match. The platform re-checks the email too.
        need('investor.delete');
        if (!input.confirm_email) return err(400, 'bad_request', 'confirm_email is required to delete an account');
        result = await platform.deleteAccount(params.id, input.confirm_email);
        break;
    }

    // Refresh the cached snapshot so the UI reflects the change immediately.
    await getInvestorSnapshot(params.id, { force: true }).catch(() => {});

    await audit(actor, `investor.${input.action}`, {
      entityType: 'platform_user',
      entityId: params.id,
      data: {
        status: input.status,
        reason: input.reason,
        profile_fields: input.profile ? Object.keys(input.profile) : undefined,
        kyc: input.kyc ? { level: input.kyc.level, status: input.kyc.status } : undefined,
        balance: input.balance
          ? { amount: input.balance.amount, direction: input.balance.direction, account_type: input.balance.account_type }
          : undefined,
        // Record only THAT a password was set — never the password itself.
        credentials: input.credentials
          ? { password_set: true, forced_change: input.credentials.require_password_change }
          : undefined,
        transaction: input.transaction
          ? { type: input.transaction.type, amount: input.transaction.amount, applied: input.transaction.apply_to_balance }
          : undefined,
        transaction_id: input.transaction_id,
        transaction_patch: input.transaction_patch,
        position: input.position,
        position_id: input.position_id,
        bot: input.bot,
        payment_method_id: input.payment_method_id,
        // Never log the masked card/bank detail itself, only that one was added.
        payment_method: input.payment_method ? { kind: input.payment_method.kind } : undefined,
      },
      ip: getIp(req),
    });

    return ok({ result });
  } catch (e) {
    return handleError(e);
  }
}
