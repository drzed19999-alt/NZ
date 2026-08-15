'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui';

export function useAction(id: string, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { success, error } = useToast();

  async function run(body: unknown, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/api/investors/${id}/action`, body);
      setMsg(okMsg);
      success('Action completed', okMsg);
      onDone();
      return true;
    } catch (e: any) {
      setMsg(e.message);
      error('Action failed', e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, msg, run };
}
