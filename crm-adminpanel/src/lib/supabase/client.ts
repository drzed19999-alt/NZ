'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

// Browser Supabase client. Uses the anon key + RLS. Safe to expose.
export function createClient() {
  return createBrowserClient(env.supabase.url, env.supabase.anonKey);
}
