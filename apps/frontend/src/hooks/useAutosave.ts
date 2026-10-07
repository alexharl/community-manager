import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/errors';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Führt Patches zusammen; verschachtelte Objekte (z. B. `mail`) eine Ebene tief. */
function mergePatches<T extends object>(current: T | null, patch: T): T {
  const result: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    result[key] = isPlainObject(existing) && isPlainObject(value) ? { ...existing, ...value } : value;
  }
  return result as T;
}

/**
 * Automatisches Speichern (Spezifikation Kap. 7.1, Entscheidung A8).
 * - `schedule(patch)` sammelt Teil-Änderungen und speichert nach `delay` ms (Texteingaben)
 * - `saveNow(patch)` speichert sofort (Schalter, Auswahl, Tags)
 * - `discard()` verwirft Ausstehendes (z. B. vor dem Löschen des Objekts)
 * Speichervorgänge laufen nacheinander; offene Änderungen werden beim Verlassen der Seite gespeichert.
 */
export function useAutosave<T extends object>(save: (patch: T) => Promise<unknown>, delay = 500) {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef(save);
  const pending = useRef<T | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    if (!patch) return;
    pending.current = null;
    inFlight.current += 1;

    queue.current = queue.current.then(async () => {
      try {
        await saveRef.current(patch);
        setError(null);
        // „Gespeichert“ erst, wenn nichts mehr aussteht
        if (inFlight.current === 1 && !pending.current) setState('saved');
      } catch (err) {
        setError(errorMessage(err));
        setState('error');
      } finally {
        inFlight.current -= 1;
      }
    });
  }, []);

  const merge = useCallback((patch: T) => {
    pending.current = mergePatches(pending.current, patch);
    setState('saving');
  }, []);

  const schedule = useCallback(
    (patch: T) => {
      merge(patch);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    [merge, flush, delay],
  );

  const saveNow = useCallback(
    (patch: T) => {
      merge(patch);
      flush();
    },
    [merge, flush],
  );

  const discard = useCallback(() => {
    window.clearTimeout(timer.current);
    pending.current = null;
  }, []);

  // Beim Verlassen ausstehende Änderungen nicht verlieren
  useEffect(() => flush, [flush]);

  return { state, error, schedule, saveNow, discard };
}
