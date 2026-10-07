export interface ImageType {
  ext: 'png' | 'jpg' | 'webp' | 'svg';
  mime: string;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Erkennt das Bildformat am Dateiinhalt statt am (vom Browser gelieferten) MIME-Type.
 * Unterstützt PNG, JPG, WebP und SVG; alles andere ergibt `undefined`.
 */
export function detectImageType(buffer: Buffer): ImageType | undefined {
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return { ext: 'png', mime: 'image/png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  // SVG ist Text; <svg> kann nach XML-Prolog oder Kommentaren stehen
  if (/<svg[\s>]/i.test(buffer.toString('utf8', 0, 4096))) {
    return { ext: 'svg', mime: 'image/svg+xml' };
  }
  return undefined;
}
