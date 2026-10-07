import {
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { usePopoverPosition } from '../../hooks/usePopoverPosition';
import { cx } from '../../lib/cx';
import { Field, type FieldMessageProps } from '../ui';
import { Chip } from './Chip';
import styles from './ChipInput.module.css';

export interface ChipInputProps extends FieldMessageProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  /** Bereinigt eine Eingabe; leerer String = verwerfen. */
  normalize?: (raw: string) => string;
  /** Fehlermeldung für ungültige Werte, sonst `null`. Ungültiges bleibt im Eingabefeld stehen. */
  validate?: (value: string) => string | null;
  /** Zeichen, die beim Tippen/Einfügen einen Eintrag abschließen. */
  separators?: RegExp;
  placeholder?: string;
  disabled?: boolean;
  removeLabel?: (value: string) => string;
  className?: string;
}

const MAX_SUGGESTIONS = 8;
const defaultNormalize = (raw: string) => raw.trim();
const defaultRemoveLabel = (value: string) => `${value} entfernen`;

/**
 * Generische Mehrfacheingabe mit Chips und Vorschlägen (Spezifikation Kap. 7.5).
 * Basis für TagInput und EmailListInput.
 */
export function ChipInput({
  id,
  label,
  hint,
  error,
  warning,
  value,
  onChange,
  suggestions = [],
  normalize = defaultNormalize,
  validate,
  separators = /[,;]/,
  placeholder,
  disabled = false,
  removeLabel = defaultRemoveLabel,
  className,
}: ChipInputProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = new Set(value.map((item) => item.toLowerCase()));
  const query = text.trim().toLowerCase();
  const options = suggestions
    .filter((s) => !selected.has(s.toLowerCase()) && s.toLowerCase().includes(query))
    .slice(0, MAX_SUGGESTIONS);
  const open = focused && !dismissed && !disabled && options.length > 0;
  const active = open && highlight < options.length ? highlight : -1;

  usePopoverPosition(listRef, anchorRef, open, options.length);

  /** Übernimmt Einträge; ungültige bleiben (mit Fehlermeldung) im Eingabefeld stehen. */
  function add(entries: string[], rest = '') {
    const next = [...value];
    const known = new Set(selected);
    const rejected: string[] = [];
    let message: string | null = null;

    for (const entry of entries) {
      const normalized = normalize(entry);
      if (!normalized) continue;
      // Vorhandene Schreibweise übernehmen (Spezifikation Kap. 4.3)
      const item =
        suggestions.find((s) => s.toLowerCase() === normalized.toLowerCase()) ?? normalized;
      const problem = validate?.(item) ?? null;
      if (problem) {
        rejected.push(entry.trim());
        message ??= problem;
        continue;
      }
      if (known.has(item.toLowerCase())) continue;
      known.add(item.toLowerCase());
      next.push(item);
    }

    if (next.length !== value.length) onChange(next);
    setText([...rejected, rest].filter(Boolean).join(', '));
    setInputError(message);
    setHighlight(-1);
  }

  function handleChange(raw: string) {
    setDismissed(false);
    setInputError(null);
    if (separators.test(raw)) {
      const parts = raw.split(separators);
      add(parts, parts.pop() ?? '');
    } else {
      setText(raw);
      setHighlight(-1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    // Zeilenumbrüche gingen im einzeiligen Feld verloren → selbst aufteilen
    if (/[\r\n]/.test(pasted) || separators.test(pasted)) {
      event.preventDefault();
      add(`${text}${pasted}`.split(new RegExp(`${separators.source}|[\\r\\n]+`)));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!options.length) return;
        event.preventDefault();
        setDismissed(false);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const start = active === -1 ? (step > 0 ? -1 : 0) : active;
        setHighlight((start + step + options.length) % options.length);
        break;
      }
      case 'Enter': {
        const option = active >= 0 ? options[active] : undefined;
        if (option !== undefined) {
          event.preventDefault();
          add([option]);
        } else if (text.trim()) {
          // Nicht das umgebende Formular absenden
          event.preventDefault();
          add([text]);
        }
        break;
      }
      case 'Backspace':
        if (!text && value.length) onChange(value.slice(0, -1));
        break;
      case 'Escape':
        // Nur die Vorschläge schließen, nicht einen umgebenden Dialog
        if (open) {
          event.preventDefault();
          setDismissed(true);
        }
        break;
    }
  }

  function focusInput(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      event.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error || inputError}
      warning={warning}
      className={className}
    >
      {(control) => (
        <div
          ref={anchorRef}
          className={cx(styles.box, disabled && styles.disabled)}
          onMouseDown={focusInput}
        >
          {value.map((item, index) => (
            <Chip
              key={item}
              removeLabel={removeLabel(item)}
              onRemove={disabled ? undefined : () => onChange(value.filter((_, i) => i !== index))}
            >
              {item}
            </Chip>
          ))}
          <input
            {...control}
            ref={inputRef}
            className={styles.input}
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
            onFocus={() => {
              setFocused(true);
              setDismissed(false);
            }}
            onBlur={() => {
              setFocused(false);
              if (text.trim()) add([text]);
            }}
            onChange={(event) => handleChange(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
          />
          <ul ref={listRef} id={listboxId} role="listbox" popover="manual" className={styles.listbox}>
            {options.map((option, index) => (
              <li
                key={option}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={cx(styles.option, index === active && styles.active)}
                // mousedown statt click: Fokus bleibt im Eingabefeld
                onMouseDown={(event) => {
                  event.preventDefault();
                  add([option]);
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Field>
  );
}
