import { normalizeTag } from '@cm/shared';
import { useTags } from '../../api/tags';
import { ChipInput, type ChipInputProps } from './ChipInput';

type TagInputProps = Omit<ChipInputProps, 'suggestions' | 'normalize' | 'validate' | 'separators'>;

/** Tags mit Vorschlägen aus allen Dokumenten und Vorlagen; Leerzeichen sind innerhalb eines Tags erlaubt. */
export function TagInput({ placeholder = 'Tag hinzufügen …', ...props }: TagInputProps) {
  const { data: tags = [] } = useTags('all');
  return (
    <ChipInput
      {...props}
      placeholder={placeholder}
      suggestions={tags}
      normalize={normalizeTag}
      separators={/[,;]/}
      removeLabel={(tag) => `Tag „${tag}“ entfernen`}
    />
  );
}
