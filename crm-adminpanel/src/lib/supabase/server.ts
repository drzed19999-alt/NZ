import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

// Server Supabase client bound to the request cookies. Respects RLS as the
// signed-in CRM user. Use in Server Components and Route Handlers.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render — safe to ignore; middleware
          // refreshes the session cookie.
        }
      },
    },
  });
}
