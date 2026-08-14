/**
 * Investor admin panels. Each is permission-gated in the UI and re-checked
 * server-side in /api/investors/[id]/action — the UI gate is UX only.
 */
export { BotPanel } from './BotPanel';
export { DangerZone } from './DangerZone';
export { PaymentMethodsPanel } from './PaymentMethodsPanel';
export { PositionsPanel } from './PositionsPanel';
export { TransactionsPanel } from './TransactionsPanel';
export { useAction } from './useAction';
