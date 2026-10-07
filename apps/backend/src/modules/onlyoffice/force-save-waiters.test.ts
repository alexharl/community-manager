import { describe, expect, it } from 'vitest';
import { ForceSaveWaiters } from './force-save-waiters';

describe('ForceSaveWaiters', () => {
  it('löst alle Wartenden eines Dokuments gemeinsam auf', async () => {
    const waiters = new ForceSaveWaiters();
    const a = waiters.wait('doc', 1000);
    const b = waiters.wait('doc', 1000);
    const other = waiters.wait('anderes', 50);
    waiters.settle('doc');
    await expect(Promise.all([a.promise, b.promise])).resolves.toBeDefined();
    await expect(other.promise).rejects.toMatchObject({
      code: 'FORCESAVE_TIMEOUT',
      statusCode: 504,
    });
  });

  it('gibt Fehler weiter und ignoriert Callbacks ohne Wartende', async () => {
    const waiters = new ForceSaveWaiters();
    waiters.settle('niemand');
    const waiter = waiters.wait('doc', 1000);
    waiters.settle('doc', new Error('DS-Fehler'));
    await expect(waiter.promise).rejects.toThrow('DS-Fehler');
  });

  it('abgebrochene Wartende laufen nicht mehr in den Timeout', async () => {
    const waiters = new ForceSaveWaiters();
    const waiter = waiters.wait('doc', 10);
    waiter.cancel();
    const result = await Promise.race([
      waiter.promise.then(
        () => 'aufgelöst',
        () => 'abgelehnt',
      ),
      new Promise((resolve) => setTimeout(() => resolve('offen'), 40)),
    ]);
    expect(result).toBe('offen');
  });
});
