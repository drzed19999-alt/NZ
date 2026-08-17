'use client';

import { useEffect, useRef } from 'react';

/**
 * Re-runs a loader on an interval so a page stays current without the operator
 * reloading it.
 *
 * Two things make this cheap enough to leave on every page:
 *
 *  - It stops entirely while the tab is hidden. A CRM left open on a second
 *    monitor all day would otherwise keep polling for nothing, and every one of
 *    those requests costs a platform API call.
 *  - It refreshes once immediately on becoming visible again, so returning to
 *    the tab shows current data rather than whatever was on screen when you left.
 *
 * Overlapping runs are suppressed: a slow request cannot stack up behind itself.
 */
export function useLiveRefresh(
  load: () => Promise<unknown> | unknown,
  intervalMs = 20000,
  enabled = true
) {
  // Kept in a ref so a caller passing an inline function does not restart the
  // timer on every render.
  const loadRef = useRef(load);
  loadRef.current = load;

  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      if (inFlight.current || document.hidden) return;
      inFlight.current = true;
      try { await loadRef.current(); }
      catch { /* a failed poll is not worth surfacing; the next one may work */ }
      finally { inFlight.current = false; }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      void run();   // catch up immediately
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
