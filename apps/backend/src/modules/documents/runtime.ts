import { KeyedMutex } from '../../lib/mutex';
import { ForceSaveWaiters } from '../onlyoffice/force-save-waiters';

/** Prozessweite Sperre je Dokument: Dateischreiben, PDF-Erzeugung und Löschen nie gleichzeitig. */
export const documentLocks = new KeyedMutex();

/** Wartende „Abschließen“-Aufrufe, aufgelöst durch den Callback mit Status 6/7. */
export const forceSaveWaiters = new ForceSaveWaiters();

/** Maximale Wartezeit auf den Force-Save-Callback (Kap. 5.3). */
export const FORCESAVE_TIMEOUT_MS = 20_000;
