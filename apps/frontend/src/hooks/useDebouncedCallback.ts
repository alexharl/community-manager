import { useCallback, useEffect, useMemo, useRef } from 'react';

/** Führt `fn` erst aus, wenn `delay` ms lang kein weiterer Aufruf kam; `cancel` verwirft Ausstehendes. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = useRef(fn);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const call = useCallback(
    (...args: A) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
  const cancel = useCallback(() => window.clearTimeout(timer.current), []);

  return useMemo(() => ({ call, cancel }), [call, cancel]);
}
