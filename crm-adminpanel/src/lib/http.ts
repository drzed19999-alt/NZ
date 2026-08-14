import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth';
import { PlatformNotConfiguredError, PlatformApiError } from '@/lib/crypto-platform/client';

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

// Uniform error mapping for route handlers. Wrap handler bodies in try/catch
// and pass the caught error here.
export function handleError(e: unknown) {
  if (e instanceof AuthError) return err(e.status, e.status === 401 ? 'unauthorized' : 'forbidden', e.message);
  if (e instanceof ZodError) return err(400, 'validation', 'Invalid input', e.flatten());
  if (e instanceof PlatformNotConfiguredError) return err(503, 'platform_not_configured', e.message);
  if (e instanceof PlatformApiError) return err(502, 'platform_error', e.message, e.body);
  console.error('[api] unhandled error:', e);
  return err(500, 'internal', 'Internal server error');
}

export function getIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  return xff ? xff.split(',')[0].trim() : null;
}
