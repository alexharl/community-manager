const TRANSLITERATION: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Dateinamen-tauglicher Slug: nur [a-z0-9-], Umlaute umschrieben, höchstens `maxLength` Zeichen. */
export function slugify(text: string, maxLength = 60): string {
  const slug = text
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => TRANSLITERATION[char] ?? char)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, maxLength).replace(/-+$/, '') || 'dokument';
}
