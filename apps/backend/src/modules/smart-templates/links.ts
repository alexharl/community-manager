import type PizZip from 'pizzip';

// Unsichtbares Trennzeichen als Klammer um Link-Platzhalter im gerenderten Text
const MARK = '⁣';
const MARKER_PATTERN = new RegExp(`${MARK}L(\\d+)${MARK}`, 'g');
const RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink';

// Formatierung am Anfang eines Laufs; endet am ersten </w:rPr>, greift also nie in den nächsten Lauf
const RUN_PROPERTIES = /^<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr>/;
const EMPTY_RUN = /<w:r(?:\s[^>]*)?>(?:<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr>)?<\/w:r>/g;

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

    // Lauf (<w:r>) an jedem Platzhalter schließen, Hyperlink einfügen und mit gleicher Formatierung
    // fortsetzen – übrige Inhalte wie Zeilenumbrüche oder Tabulatoren bleiben an ihrer Stelle
    xml = xml.replace(
      /(<w:r(?:\s[^>]*)?>)([\s\S]*?)<\/w:r>/g,
      (run, open: string, inner: string) => {
        if (!inner.includes(MARK)) return run;
        const rPr = inner.match(RUN_PROPERTIES)?.[0] ?? '';
        const keep = (name: string) => rPr.match(new RegExp(`<w:${name}\\b[^>]*/>`))?.[0] ?? '';
        const linkRPr = `<w:rPr><w:rStyle w:val="Hyperlink"/>${keep('rFonts')}<w:color w:val="0563C1"/>${keep('sz')}${keep('szCs')}<w:u w:val="single"/></w:rPr>`;

        const body = inner
          .slice(rPr.length)
          .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (textElement, text: string) => {
            if (!text.includes(MARK)) return textElement;
            return text
              .split(MARKER_PATTERN)
              .map((part, index) => {
                if (index % 2 === 0) return part ? `<w:t xml:space="preserve">${part}</w:t>` : '';
                const link = this.links[Number(part)];
                if (!link) return '';
                used.add(Number(part));
                return `</w:r><w:hyperlink r:id="rIdCmLink${part}" w:history="1"><w:r>${linkRPr}<w:t xml:space="preserve">${escapeXml(link.text)}</w:t></w:r></w:hyperlink><w:r>${rPr}`;
              })
              .join('');
          });
        // Leere Läufe entstehen, wenn der Link am Anfang oder Ende stand
        return `${open}${rPr}${body}</w:r>`.replace(EMPTY_RUN, '');
      },
    );

    // Sicherheitsnetz: Platzhalter außerhalb eines Textelements als Klartext einsetzen
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
