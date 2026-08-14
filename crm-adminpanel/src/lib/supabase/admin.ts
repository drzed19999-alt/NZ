import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Service-role client. Bypasses RLS — SERVER ONLY. Use for privileged writes
// (audit logs, investor cache, admin management) AFTER authorizing in code.
export function createAdminClient() {
  return createSupabaseClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
