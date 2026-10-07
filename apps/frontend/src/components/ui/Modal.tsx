import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from './IconButton';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** `false` sperrt Schließen per Esc, Hintergrund-Klick und X (z. B. während einer Aktion). */
  dismissible?: boolean;
}

/**
 * Modaler Dialog auf Basis von <dialog>. Ist nur im DOM, solange er offen ist.
 * Das Element mit `data-autofocus` erhält beim Öffnen den Fokus.
 */
export function Modal({ open, ...props }: ModalProps) {
  if (!open) return null;
  return <ModalDialog {...props} />;
}

function ModalDialog({
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: Omit<ModalProps, 'open'>) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      // Nur schließen, wenn Klick auf dem Hintergrund begann und endete (nicht beim Markieren von Text)
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (dismissible && pressedOnBackdrop.current && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {dismissible && <IconButton icon={<X />} label="Schließen" onClick={onClose} />}
        </header>
        {children && <div className={styles.body}>{children}</div>}
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}
