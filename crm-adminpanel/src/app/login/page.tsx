'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BRAND } from '@/lib/brand';
import { Button, Callout, Field, Orbit, TextInput } from '@/components/ui';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(search.get('next') || '/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] animate-in">
        {/* Crest */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[17px] font-extrabold mb-4"
            style={{ background: 'var(--gold-grad)', color: '#16130A', boxShadow: '0 12px 36px -10px rgba(212,175,55,.55)' }}
          >
            {BRAND.monogram}
          </div>
          <h1 className="display text-[27px] tracking-tight">{BRAND.name}</h1>
          <div className="eyebrow mt-1.5">{BRAND.tagline}</div>
        </div>

        <form onSubmit={onSubmit} className="panel-lux p-8">
          <div className="mb-6">
            <div className="display text-[19px]">Welcome back</div>
            <p className="muted text-[12.5px] mt-1">Sign in to access the client desk.</p>
          </div>

          <Field label="Email address" className="mb-5">
            <TextInput
              type="email" value={email} autoComplete="email" placeholder="you@vtmarkets.com"
              onChange={(e) => setEmail(e.target.value)} required
            />
          </Field>

          <Field label="Password" className="mb-5">
            <TextInput
              type="password" value={password} autoComplete="current-password" placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)} required
            />
          </Field>

          {error && <Callout className="mb-5">{error}</Callout>}

          <Button variant="primary" className="w-full" disabled={loading}>
            {loading ? <><Orbit size={16} /> Signing in…</> : 'Sign in'}
          </Button>
        </form>

        <p className="muted text-[11px] text-center mt-6 leading-relaxed">
          Restricted to provisioned personnel.<br />
          All access is logged and audited.
        </p>
      </div>
    </div>
  );
}
