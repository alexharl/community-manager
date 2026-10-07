/** Einheitliches Fehlerformat aller API-Antworten (Spezifikation Kap. 6). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** ISO-8601-Zeitstempel, wie ihn die API in JSON liefert. */
export type ISODate = string;
