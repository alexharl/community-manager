import { describe, expect, it } from 'vitest';
import { detectImageType } from './images';

describe('detectImageType', () => {
  it('erkennt PNG, JPG, WebP und SVG am Inhalt', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    const svg = Buffer.from('<?xml version="1.0"?>\n<!-- Logo -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    expect(detectImageType(png)?.ext).toBe('png');
    expect(detectImageType(jpg)?.ext).toBe('jpg');
    expect(detectImageType(webp)?.ext).toBe('webp');
    expect(detectImageType(svg)?.mime).toBe('image/svg+xml');
  });

  it('lehnt andere Inhalte ab', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7'))).toBeUndefined();
    expect(detectImageType(Buffer.from('<html><body>svg</body></html>'))).toBeUndefined();
    expect(detectImageType(Buffer.alloc(0))).toBeUndefined();
  });
});
