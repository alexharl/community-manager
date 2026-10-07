import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { AppError } from '../../lib/errors';
import { describeTemplateError } from './errors';
import type { LinkRegistry } from './links';
import { templateParser } from './parser';

/**
 * Befüllt eine Vorlagen-DOCX (Kap. 14.4, Schritt 4). Asynchron, damit `tage()` Veranstaltungen
 * nachladen kann; danach werden Link-Platzhalter in echte Hyperlinks umgewandelt.
 */
export async function renderTemplate(
  template: Buffer,
  data: object,
  links: LinkRegistry,
): Promise<Buffer> {
  try {
    const doc = new Docxtemplater(new PizZip(template), {
      paragraphLoop: true,
      linebreaks: true,
      parser: templateParser,
      // Unbekannte oder leere Werte nicht als „undefined“ ausgeben
      nullGetter: () => '',
    });
    await doc.renderAsync(data);
    const zip = doc.getZip();
    links.apply(zip);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch (error) {
    throw new AppError(
      422,
      'TEMPLATE_INVALID',
      `Vorlage fehlerhaft: ${describeTemplateError(error)}`,
    );
  }
}
