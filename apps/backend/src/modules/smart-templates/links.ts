import type PizZip from 'pizzip';

// Unsichtbares Trennzeichen als Klammer um Link-Platzhalter im gerenderten Text
const MARK = '⁣';
const MARKER_PATTERN = new RegExp(`${MARK}L(\\d+)${MARK}`, 'g');
const RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink';

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Echte Hyperlinks in gerenderten Vorlagen (Entscheidung S8). Werte wie `webseite` liefern einen
 * unsichtbaren Platzhaltertext; `apply` ersetzt ihn nach dem Rendern durch `<w:hyperlink>`.
 */
export class LinkRegistry {
  private readonly links: { url: string; text: string }[] = [];

  /** Platzhaltertext für einen Link, der später als „text“ auf `url` verweist. */
  add(url: string, text: string): string {
    const index = this.links.push({ url, text }) - 1;
    return `${MARK}L${index}${MARK}`;
  }

  get size(): number {
    return this.links.length;
  }

  apply(zip: PizZip): void {
    if (this.links.length === 0) return;
    const documentPath = 'word/document.xml';
    const relsPath = 'word/_rels/document.xml.rels';
    let xml = zip.file(documentPath)?.asText() ?? '';
    let rels = zip.file(relsPath)?.asText() ?? '';
    const used = new Set<number>();

    // Jeden Lauf (<w:r>) mit Platzhalter in Text-Läufe und Hyperlinks aufteilen
    xml = xml.replace(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g, (run, inner: string) => {
      if (!inner.includes(MARK)) return run;
      const texts = [...inner.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
      // Nur einfache Läufe (Formatierung + ein Text) aufteilen; Sonderfälle unten als Klartext
      if (texts.length !== 1 || /<w:(?:tab|br|drawing|fldChar)\b/.test(inner)) return run;
      const rPr = inner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
      const keep = (name: string) => rPr.match(new RegExp(`<w:${name}\\b[^>]*/>`))?.[0] ?? '';
      const linkRPr = `<w:rPr><w:rStyle w:val="Hyperlink"/>${keep('rFonts')}<w:color w:val="0563C1"/>${keep('sz')}${keep('szCs')}<w:u w:val="single"/></w:rPr>`;

      return texts[0]![1]!
        .split(MARKER_PATTERN)
        .map((part, index) => {
          if (index % 2 === 0) {
            return part ? `<w:r>${rPr}<w:t xml:space="preserve">${part}</w:t></w:r>` : '';
          }
          const link = this.links[Number(part)];
          if (!link) return '';
          used.add(Number(part));
          return `<w:hyperlink r:id="rIdCmLink${part}" w:history="1"><w:r>${linkRPr}<w:t xml:space="preserve">${escapeXml(link.text)}</w:t></w:r></w:hyperlink>`;
        })
        .join('');
    });

    // Übrige Platzhalter (z. B. in Läufen mit Tabulator) als Klartext einsetzen
    xml = xml.replace(MARKER_PATTERN, (_match, index: string) =>
      escapeXml(this.links[Number(index)]?.text ?? ''),
    );

    if (!/<w:document\b[^>]*\sxmlns:r=/.test(xml)) {
      xml = xml.replace(
        /<w:document\b/,
        '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
      );
    }
    const relationships = [...used]
      .map(
        (index) =>
          `<Relationship Id="rIdCmLink${index}" Type="${RELATIONSHIP_TYPE}" Target="${escapeXml(this.links[index]!.url)}" TargetMode="External"/>`,
      )
      .join('');
    rels = rels.replace('</Relationships>', `${relationships}</Relationships>`);

    zip.file(documentPath, xml);
    zip.file(relsPath, rels);
  }
}
