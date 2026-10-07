import PizZip from 'pizzip';
import { describe, expect, it, vi } from 'vitest';
import { parseIsoDate } from '../../lib/dates';
import type { EventSource } from '../events';
import { analyzeTemplate } from './analyze';
import { buildTemplateData, EVENTS_UNAVAILABLE } from './context';
import { buildDocx, paragraphTexts } from './docx-fixture';
import { LinkRegistry } from './links';
import { renderTemplate } from './render';

// Protokoll-Vorlage aus Kap. 14.2 (Absatzformate spielen für die Logik keine Rolle)
const protocol = (range: string) => [
  `{#tage(${range})}`,
  '{wochentag} {datum}:',
  '{#veranstaltungen | oderLeer}',
  '• {titel} {webseite}',
  '◦ AV:',
  '{/}',
  '{/}',
];

const events: EventSource = {
  listEvents: vi.fn(async (from: string, to: string) =>
    [
      { title: 'Vultures', date: '2026-10-02', time: '22:00', url: 'https://example.org/vultures' },
      { title: 'Konzert A', date: '2026-10-08', time: '19:00', url: null },
      { title: 'Konzert B', date: '2026-10-08', time: '21:00', url: 'https://example.org/b' },
    ].filter((event) => event.date >= from && event.date <= to),
  ),
};

function setup(source: EventSource | null = events) {
  const links = new LinkRegistry();
  const warnings: string[] = [];
  const data = buildTemplateData({
    referenceDate: parseIsoDate('2026-10-07'),
    verein: 'TSV',
    titel: 'Vorstandssitzung 07.10.2026',
    vorlage: 'Vorstandssitzung',
    events: source,
    links,
    warnings,
  });
  return { links, warnings, data };
}

describe('analyzeTemplate', () => {
  it('sammelt Platzhalter und erkennt Datumsabhängigkeit', () => {
    const result = analyzeTemplate(buildDocx(['{titel}', ...protocol('-6, -1')]));
    expect(result.requiresDate).toBe(true);
    expect(result.error).toBeNull();
    expect(result.placeholders).toEqual(
      expect.arrayContaining(['titel', 'tage(-6, -1)', 'veranstaltungen | oderLeer', 'webseite']),
    );
  });

  it('kennt den Filter „mitVeranstaltungen“', () => {
    const result = analyzeTemplate(buildDocx(['{#tage(-6, -1) | mitVeranstaltungen}', '{/}']));
    expect(result.error).toBeNull();
    expect(result.requiresDate).toBe(true);
  });

  it('erkennt tage() auch ohne weitere Datumsfelder; Tippfehler im Funktionsnamen werden gemeldet', () => {
    const onlyDays = analyzeTemplate(buildDocx(['{#tage(0, 7)}{#veranstaltungen}{titel}{/}{/}']));
    expect(onlyDays).toMatchObject({ requiresDate: true, error: null });
    expect(analyzeTemplate(buildDocx(['{#tagee(0, 7)}', '{/}'])).error).toBe(
      'Unbekannte Platzhalter: „tagee“ – sie bleiben leer.',
    );
  });

  it('braucht ohne Datumsfelder kein Sitzungsdatum', () => {
    expect(analyzeTemplate(buildDocx(['Protokoll {verein}'])).requiresDate).toBe(false);
  });

  it('meldet Syntaxfehler und unbekannte Platzhalter verständlich', () => {
    expect(analyzeTemplate(buildDocx(['{#tage(0, 7)}', 'Text'])).error).toBe(
      'Schleife „{#tage(0, 7)}“ wird nicht geschlossen – „{/}“ fehlt.',
    );
    expect(analyzeTemplate(buildDocx(['{#veranstaltungen | gibtsNicht}', '{/}'])).error).toMatch(
      /ist ungültig.*gibtsNicht/,
    );
    expect(analyzeTemplate(buildDocx(['{ort}'])).error).toBe(
      'Unbekannte Platzhalter: „ort“ – sie bleiben leer.',
    );
  });
});

describe('renderTemplate', () => {
  it('Rückblick −6 bis gestern, aufsteigend; leerer Punkt ohne Veranstaltung', async () => {
    const { data, links } = setup();
    const result = await renderTemplate(buildDocx(protocol('-6, -1')), data, links);
    const texts = paragraphTexts(result);
    expect(texts.filter((t) => t.endsWith(':') && !t.startsWith('◦'))).toEqual([
      'Donnerstag 01.10:',
      'Freitag 02.10:',
      'Samstag 03.10:',
      'Sonntag 04.10:',
      'Montag 05.10:',
      'Dienstag 06.10:',
    ]);
    // Freitag mit Veranstaltung, Donnerstag mit leerem Punkt
    expect(texts.slice(0, 6)).toEqual([
      'Donnerstag 01.10:',
      '•  ',
      '◦ AV:',
      'Freitag 02.10:',
      '• Vultures Webseite',
      '◦ AV:',
    ]);
  });

  it('Vorblick heute bis selber Wochentag nächste Woche; je Veranstaltung ein eigener Punkt', async () => {
    const { data, links } = setup();
    const texts = paragraphTexts(await renderTemplate(buildDocx(protocol('0, 7')), data, links));
    const headings = texts.filter((t) => /^\w+ \d\d\.\d\d:$/.test(t));
    expect(headings[0]).toBe('Mittwoch 07.10:');
    expect(headings.at(-1)).toBe('Mittwoch 14.10:');
    const thursday = texts.indexOf('Donnerstag 08.10:');
    expect(texts.slice(thursday, thursday + 5)).toEqual([
      'Donnerstag 08.10:',
      '• Konzert A ',
      '◦ AV:',
      '• Konzert B Webseite',
      '◦ AV:',
    ]);
  });

  it('setzt echte Hyperlinks mit Beziehung im Paket', async () => {
    const { data, links } = setup();
    const result = await renderTemplate(buildDocx(protocol('-6, 7')), data, links);
    const zip = new PizZip(result);
    const xml = zip.file('word/document.xml')!.asText();
    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    expect(xml.match(/<w:hyperlink r:id="rIdCmLink\d+"/g)).toHaveLength(2);
    expect(xml).not.toContain('⁣');
    expect(xml).toContain('xmlns:r=');
    expect(rels).toContain('Target="https://example.org/vultures" TargetMode="External"');
  });

  it('Rückblick mit „mitVeranstaltungen“: Tage ohne Veranstaltung entfallen ganz', async () => {
    const { data, links } = setup();
    const template = protocol('-6, -1');
    template[0] = '{#tage(-6, -1) | mitVeranstaltungen}';
    const texts = paragraphTexts(await renderTemplate(buildDocx(template), data, links));
    expect(texts).toEqual(['Freitag 02.10:', '• Vultures Webseite', '◦ AV:']);
  });

  it('setzt Links auch in Läufen mit Zeilenumbruch und Tabulator (Vorlage als ein Absatz)', async () => {
    const { data, links } = setup();
    // So legt ONLYOFFICE Zeilen mit Umschalt+Enter an: ein Absatz, Umbrüche im selben Lauf
    const paragraph =
      '<w:p><w:r><w:t xml:space="preserve">{#tage(-5, -5)}</w:t><w:br/></w:r>' +
      '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{wochentag}:</w:t></w:r>' +
      '<w:r><w:tab/><w:t xml:space="preserve">{#veranstaltungen}{titel} {webseite}</w:t><w:br/><w:t xml:space="preserve">AV:</w:t></w:r>' +
      '<w:r><w:t xml:space="preserve">{/}{/}</w:t></w:r></w:p>';
    const xml = new PizZip(await renderTemplate(buildDocx([paragraph]), data, links))
      .file('word/document.xml')!
      .asText();
    expect(xml).toContain(
      '<w:r><w:tab/><w:t xml:space="preserve">Vultures </w:t></w:r><w:hyperlink r:id="rIdCmLink0" w:history="1">',
    );
    expect(xml).toContain('</w:hyperlink><w:r><w:br/><w:t xml:space="preserve">AV:</w:t></w:r>');
    expect(xml).not.toContain('⁣');
  });

  it('erstellt das Dokument auch, wenn die Veranstaltungen nicht erreichbar sind', async () => {
    const failing: EventSource = { listEvents: async () => Promise.reject(new Error('down')) };
    const { data, links, warnings } = setup(failing);
    const texts = paragraphTexts(await renderTemplate(buildDocx(protocol('-6, -1')), data, links));
    expect(texts[1]).toBe('•  ');
    expect(warnings).toEqual([EVENTS_UNAVAILABLE]);
  });

  it('lädt Veranstaltungen je Zeitraum nur einmal', async () => {
    const source: EventSource = { listEvents: vi.fn(async () => []) };
    const { data, links } = setup(source);
    await renderTemplate(buildDocx([...protocol('-6, -1'), ...protocol('-6, -1')]), data, links);
    expect(source.listEvents).toHaveBeenCalledTimes(1);
    expect(source.listEvents).toHaveBeenCalledWith('2026-10-01', '2026-10-06');
  });
});
