// Client-safe formatting helpers (no server-only imports).

export function money(v: number | null | undefined, currency = 'USD'): string {
  if (v == null) return '—';
  return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
}

export function compactMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  return '$' + Number(v).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function presenceLabel(p: { online: boolean; last_active_at: string | null } | null | undefined): string {
  if (!p) return 'Unknown';
  if (p.online) return 'Online now';
  if (!p.last_active_at) return 'Never active';
  return `Active ${timeAgo(p.last_active_at)}`;
}

// Palette tuned for the dark gold theme — muted, never neon.
const STATUS_COLORS: Record<string, string> = {
  new: '#7DA6E8', contacted: '#A78BDB', qualified: '#5FB8D4', proposal: '#E8B339',
  converted: '#4ADE80', lost: '#F87171', unresponsive: '#6F6A5E',
  active: '#4ADE80', pending: '#E8B339', restricted: '#F0A05A', suspended: '#F87171', closed: '#6F6A5E',
  verified: '#4ADE80', rejected: '#F87171', none: '#6F6A5E',
  completed: '#4ADE80', failed: '#F87171', processing: '#7DA6E8', cancelled: '#6F6A5E',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6F6A5E';
}
