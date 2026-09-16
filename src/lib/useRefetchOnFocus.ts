import { useEffect, useRef } from 'react';

// Re-runs `load` on mount, whenever the window regains focus, and whenever
// the tab becomes visible again. Pages that show server status (like the AI
// key badge) used to fetch only once on mount — if that single fetch failed
// because the server was briefly unreachable, the page would show a stale
// "no key" forever. This heals it: look at the tab and it re-checks.
export function useRefetchOnFocus(load: () => void): void {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    const fire = () => ref.current();
    fire();
    window.addEventListener('focus', fire);
    const onVis = () => {
      if (!document.hidden) fire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', fire);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
