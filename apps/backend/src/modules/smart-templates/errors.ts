interface TemplateErrorProperties {
  id?: string;
  xtag?: string;
  openingtag?: string;
  explanation?: string;
  rootError?: { message?: string };
  errors?: { properties?: TemplateErrorProperties; message?: string }[];
}

function describeOne(properties: TemplateErrorProperties | undefined, fallback?: string): string {
  const tag = properties?.xtag ?? properties?.openingtag ?? '';
  switch (properties?.id) {
    case 'unclosed_loop':
      return `Schleife „{#${tag}}“ wird nicht geschlossen – „{/}“ fehlt.`;
    case 'unopened_loop':
      return `„{/${tag}}“ schließt eine Schleife, die nie geöffnet wurde.`;
    case 'closing_tag_does_not_match_opening_tag':
      return `Das schließende Tag passt nicht zu „{#${properties.openingtag}}“ – verwende „{/}“.`;
    case 'unclosed_tag':
      return `Platzhalter „{${tag}“ wird nicht geschlossen – „}“ fehlt.`;
    case 'unopened_tag':
      return `„}“ ohne öffnende Klammer bei „${tag}“.`;
    case 'duplicate_open_tag':
    case 'duplicate_close_tag':
      return `Doppelte Klammer bei „${tag}“.`;
    case 'scopeparser_compilation_failed':
      return `Platzhalter „{${tag}}“ ist ungültig (${properties.rootError?.message ?? 'Syntaxfehler'}).`;
    case 'scopeparser_execution_failed':
      return `Platzhalter „{${tag}}“ konnte nicht ausgewertet werden (${properties.rootError?.message ?? 'Fehler'}).`;
    default:
      return properties?.explanation ?? fallback ?? 'Unbekannter Fehler in der Vorlage.';
  }
}

/** Übersetzt docxtemplater-Fehler (auch Sammelfehler) in eine kurze deutsche Meldung. */
export function describeTemplateError(error: unknown): string {
  const { properties, message } = error as {
    properties?: TemplateErrorProperties;
    message?: string;
  };
  const parts = properties?.errors?.length
    ? properties.errors.map((inner) => describeOne(inner.properties, inner.message))
    : [describeOne(properties, message)];
  const unique = [...new Set(parts)];
  return (
    unique.slice(0, 3).join(' · ') + (unique.length > 3 ? ` (+${unique.length - 3} weitere)` : '')
  );
}
