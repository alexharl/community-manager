/**
 * Serialisiert Abläufe je Schlüssel (z. B. Dokument-ID) innerhalb des Prozesses:
 * Dateischreibvorgänge und PDF-Erzeugung eines Dokuments laufen nie gleichzeitig (Kap. 5.2/5.4).
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(task);
    this.tails.set(key, current);
    try {
      return await current;
    } finally {
      // Aufräumen, wenn niemand mehr wartet
      if (this.tails.get(key) === current) this.tails.delete(key);
    }
  }
}
