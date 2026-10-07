import { AppError } from '../../lib/errors';

interface Waiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Verbindet „Abschließen“ (Force-Save-Command) mit dem späteren Callback (Status 6/7).
 * Mehrere gleichzeitige Aufrufe für dasselbe Dokument werden gemeinsam aufgelöst (Kap. 5.3).
 */
export class ForceSaveWaiters {
  private readonly waiters = new Map<string, Set<Waiter>>();

  wait(documentId: string, timeoutMs: number) {
    let waiter!: Waiter;
    const promise = new Promise<void>((resolve, reject) => {
      waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.remove(documentId, waiter);
          reject(
            new AppError(
              504,
              'FORCESAVE_TIMEOUT',
              'Speichern dauert ungewöhnlich lange – bitte erneut versuchen.',
            ),
          );
        }, timeoutMs),
      };
    });
    // Ablehnung kann eintreffen, bevor der Aufrufer wartet – nicht als „unbehandelt“ werten
    promise.catch(() => undefined);

    const set = this.waiters.get(documentId) ?? new Set();
    set.add(waiter);
    this.waiters.set(documentId, set);

    return {
      promise,
      cancel: () => {
        clearTimeout(waiter.timer);
        this.remove(documentId, waiter);
      },
    };
  }

  /** Callback eingetroffen: alle Wartenden freigeben (bzw. mit Fehler abbrechen). */
  settle(documentId: string, error?: Error) {
    const set = this.waiters.get(documentId);
    if (!set) return;
    this.waiters.delete(documentId);
    for (const waiter of set) {
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error);
      else waiter.resolve();
    }
  }

  private remove(documentId: string, waiter: Waiter) {
    const set = this.waiters.get(documentId);
    set?.delete(waiter);
    if (set?.size === 0) this.waiters.delete(documentId);
  }
}
