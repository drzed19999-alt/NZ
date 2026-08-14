// Client-side fetch helper for the CRM's own API routes. Cookies carry the
// Supabase session automatically, so no auth header handling is needed.

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data?.error?.message ?? `Request failed (${res.status})`);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => apiFetch<T>(p),
  post: <T = any>(p: string, body?: unknown) => apiFetch<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(p: string, body?: unknown) => apiFetch<T>(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};
