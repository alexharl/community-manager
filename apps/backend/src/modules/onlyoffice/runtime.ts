import { KeyedMutex } from '../../lib/mutex';
import { ForceSaveWaiters } from './force-save-waiters';

/**
 * Prozessweite Sperre je bearbeitbarer Datei: Schreiben, PDF-Erzeugung und Löschen nie gleichzeitig.
 * Schlüssel: Dokument-ID bzw. `template:<id>` für Vorlageninhalte.
 */
export const fileLocks = new KeyedMutex();

/** Wartende „Abschließen“-Aufrufe, aufgelöst durch den Callback mit Status 6/7. */
export const forceSaveWaiters = new ForceSaveWaiters();

/** Maximale Wartezeit auf den Force-Save-Callback (Kap. 5.3). */
export const FORCESAVE_TIMEOUT_MS = 20_000;
