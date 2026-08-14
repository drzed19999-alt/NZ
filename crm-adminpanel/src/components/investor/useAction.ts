'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

/**
 * Shared plumbing for every admin control on an investor: POST the action,
 * surface the message, refresh the page data. Keeps each panel to its own UI.
 */
export function useAction(id: string, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(body: unknown, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/api/investors/${id}/action`, body);
      setMsg(okMsg);
      onDone();
      return true;
    } catch (e: any) {
      setMsg(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, msg, run };
}
