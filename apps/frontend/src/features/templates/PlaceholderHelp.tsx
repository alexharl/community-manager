import { CircleHelp } from 'lucide-react';
import styles from './TemplateContentSection.module.css';

const PROTOCOL_EXAMPLE = `Rückblick            ← Überschrift 2
{#tage(-6, -1)}
{wochentag} {datum}: ← Überschrift 3
{#veranstaltungen | oderLeer}
  • {titel} {webseite}
      ◦ AV:
      ◦ Mischer:
      ◦ Theke:
{/}
{/}
Vorblick             ← Überschrift 2
{#tage(0, 7)}
  … wie beim Rückblick …
{/}`;

/** Aufklappbare Kurzreferenz der Platzhalter-Sprache (Spezifikation Kap. 14.2). */
export function PlaceholderHelp() {
  return (
    <details className={styles.help}>
      <summary>
        <CircleHelp />
        Platzhalter-Hilfe
      </summary>
      <div className={styles.helpBody}>
        <p>
          Platzhalter stehen in geschweiften Klammern direkt im Text und werden beim Anlegen eines
          Dokuments einmalig befüllt. Zeilen mit <code className={styles.code}>{'{#…}'}</code> und{' '}
          <code className={styles.code}>{'{/}'}</code> stehen allein in einem Absatz und
          verschwinden dabei.
        </p>

        <h4>Schreibweise</h4>
        <dl className={styles.terms}>
          <dt>
            <code className={styles.code}>{'{feld}'}</code>
          </dt>
          <dd>setzt einen Wert ein</dd>
          <dt>
            <code className={styles.code}>{'{#liste}…{/}'}</code>
          </dt>
          <dd>wiederholt den Abschnitt für jeden Eintrag</dd>
          <dt>
            <code className={styles.code}>{'{^liste}…{/}'}</code>
          </dt>
          <dd>nur, wenn die Liste leer ist</dd>
          <dt>
            <code className={styles.code}>{'liste | oderLeer'}</code>
          </dt>
          <dd>mindestens ein leerer Eintrag – der Punkt erscheint also immer</dd>
        </dl>

        <h4>Felder</h4>
        <dl className={styles.terms}>
          <dt>
            <code className={styles.code}>verein</code>, <code className={styles.code}>titel</code>,{' '}
            <code className={styles.code}>vorlage</code>
          </dt>
          <dd>Name des Vereins, Titel des neuen Dokuments, Name der Vorlage</dd>
          <dt>
            <code className={styles.code}>datum</code>,{' '}
            <code className={styles.code}>datumLang</code>,{' '}
            <code className={styles.code}>wochentag</code>
          </dt>
          <dd>Sitzungsdatum: „07.10“, „07.10.2026“, „Mittwoch“</dd>
          <dt>
            <code className={styles.code}>tage(von, bis)</code>
          </dt>
          <dd>
            Tage relativ zum Sitzungsdatum, z. B. <code className={styles.code}>tage(-6, -1)</code>{' '}
            = die sechs Tage davor, <code className={styles.code}>tage(0, 7)</code> = Sitzungstag
            bis eine Woche später. Je Tag: <code className={styles.code}>wochentag</code>,{' '}
            <code className={styles.code}>datum</code>,{' '}
            <code className={styles.code}>datumLang</code>,{' '}
            <code className={styles.code}>veranstaltungen</code>
          </dd>
          <dt>
            je Veranstaltung: <code className={styles.code}>titel</code>,{' '}
            <code className={styles.code}>uhrzeit</code>,{' '}
            <code className={styles.code}>webseite</code>
          </dt>
          <dd>Titel, Beginn („20:00“), Link „Webseite“ zur Veranstaltung</dd>
        </dl>
        <p>
          Nutzt die Vorlage Datumsfelder oder <code className={styles.code}>tage()</code>, wird beim
          Anlegen nach dem Sitzungsdatum gefragt.
        </p>

        <h4>Beispiel: Protokoll mit Rück- und Vorblick</h4>
        <pre className={styles.example}>{PROTOCOL_EXAMPLE}</pre>
      </div>
    </details>
  );
}
