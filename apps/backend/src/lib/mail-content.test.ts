import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { BLANK_DOCX_PATH } from './assets';
import { buildMailContent, escapeHtml } from './mail-content';

describe('escapeHtml', () => {
  it('maskiert HTML-Sonderzeichen', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });
});

describe('buildMailContent', () => {
  it('stellt den Begleittext escaped und mit Zeilenumbrüchen voran', async () => {
    const docx = await readFile(BLANK_DOCX_PATH);
    const content = await buildMailContent({
      docx,
      contentText: 'Protokolltext',
      introText: 'Hallo zusammen,\nanbei das Protokoll <b>vom</b> Montag.',
    });
    expect(content.html).toContain(
      'Hallo zusammen,<br>anbei das Protokoll &lt;b&gt;vom&lt;/b&gt; Montag.',
    );
    expect(content.html).toContain('<hr');
    expect(content.text).toBe(
      'Hallo zusammen,\nanbei das Protokoll <b>vom</b> Montag.\n\nProtokolltext',
    );
    expect(content.images).toEqual([]);
  });

  it('kommt ohne Begleittext aus', async () => {
    const content = await buildMailContent({
      docx: await readFile(BLANK_DOCX_PATH),
      contentText: 'Text',
    });
    expect(content.html).not.toContain('<hr');
    expect(content.text).toBe('Text');
  });
});
