import mammoth from 'mammoth';

export interface InlineImage {
  cid: string;
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface MailContent {
  html: string;
  text: string;
  /** Bilder des Dokuments als CID-Anhänge (Data-URIs blockieren viele Mailclients). */
  images: InlineImage[];
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);

// Schlichtes Layout mit Inline-Styles; <style> nur für Tabellen, die mammoth ohne Rahmen ausgibt
const wrap = (body: string) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  table { border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #c5ccd6; padding: 4px 8px; vertical-align: top; }
  td p, th p { margin: 0; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;">
<div style="max-width:720px;margin:0 auto;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1b2330;">
${body}
</div>
</body>
</html>`;

/**
 * Mail-Inhalt aus der DOCX (Kap. 5.6): optionaler Begleittext oben, darunter der Dokumentinhalt
 * als HTML. Text-Alternative aus Begleittext und Volltext.
 */
export async function buildMailContent({
  docx,
  contentText,
  introText,
}: {
  docx: Buffer;
  contentText: string;
  introText?: string;
}): Promise<MailContent> {
  const images: InlineImage[] = [];
  const { value: documentHtml } = await mammoth.convertToHtml(
    { buffer: docx },
    {
      // Direkte Formatierung (Strg+B/I) erkennt mammoth selbst; dazu die üblichen Zeichenvorlagen
      styleMap: ["r[style-name='Strong'] => strong", "r[style-name='Emphasis'] => em"],
      convertImage: mammoth.images.imgElement(async (image) => {
        const index = images.length + 1;
        const extension = image.contentType.split('/')[1] ?? 'bin';
        const cid = `bild-${index}@community-manager`;
        images.push({
          cid,
          filename: `bild-${index}.${extension}`,
          contentType: image.contentType,
          content: Buffer.from(await image.read()),
        });
        return { src: `cid:${cid}` };
      }),
    },
  );

  const intro = introText
    ? `<p style="margin:0;">${escapeHtml(introText).replace(/\r?\n/g, '<br>')}</p>
<hr style="border:none;border-top:1px solid #dde2e8;margin:24px 0;">`
    : '';

  return {
    html: wrap(`${intro}${documentHtml}`),
    text: [introText, contentText].filter(Boolean).join('\n\n'),
    images,
  };
}
